<?php
require_once __DIR__ . '/config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Gestion des requêtes OPTIONS (Preflight)

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {

    exit;

}



$host = "127.0.0.1";

$db_name = "semee2289142_1wyhpp";

$username = "semee2289142";

$password = "MYSQLChoune@69";

$charset = 'utf8mb4';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db_name;charset=$charset", $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (\PDOException $e) {
    die(json_encode(["status" => "error", "message" => "Lien BDD mort"]));
}



// Migrations auto — compatibles MySQL 5.x
$dbName = $pdo->query("SELECT DATABASE()")->fetchColumn();

$colsForm = $pdo->query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='$dbName' AND TABLE_NAME='JSA_JOUEUR_EVAL_FORMULAIRE'")->fetchAll(PDO::FETCH_COLUMN);
if (!in_array('actif', $colsForm))       $pdo->exec("ALTER TABLE JSA_JOUEUR_EVAL_FORMULAIRE ADD COLUMN actif TINYINT(1) NOT NULL DEFAULT 1");
if (!in_array('is_template', $colsForm)) $pdo->exec("ALTER TABLE JSA_JOUEUR_EVAL_FORMULAIRE ADD COLUMN is_template TINYINT(1) NOT NULL DEFAULT 0");

$colsPlayers = $pdo->query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='$dbName' AND TABLE_NAME='vt_players'")->fetchAll(PDO::FETCH_COLUMN);
if (!in_array('onesignal_id', $colsPlayers)) $pdo->exec("ALTER TABLE vt_players ADD COLUMN onesignal_id VARCHAR(200) NULL DEFAULT NULL");



/**
 * Récupère les onesignal_id des joueurs d'une équipe
 * Essaie d'abord via vt_player_teams (join), puis fallback sur team_id direct
 */
function getTeamOsIds(PDO $pdo, int $teamId): array {
    // Tentative via table de jointure
    try {
        $stmt = $pdo->prepare(
            "SELECT p.onesignal_id FROM vt_players p
             JOIN vt_player_teams pt ON pt.player_id = p.id
             WHERE pt.team_id = ? AND p.onesignal_id IS NOT NULL AND p.onesignal_id != ''"
        );
        $stmt->execute([$teamId]);
        $ids = $stmt->fetchAll(PDO::FETCH_COLUMN);
        if (!empty($ids)) return $ids;
    } catch (Exception $e) {}

    // Fallback : team_id direct sur vt_players
    try {
        $stmt = $pdo->prepare(
            "SELECT onesignal_id FROM vt_players
             WHERE team_id = ? AND onesignal_id IS NOT NULL AND onesignal_id != ''"
        );
        $stmt->execute([$teamId]);
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    } catch (Exception $e) {}

    return [];
}

/**
 * Envoie une push notification via OneSignal à une liste de subscription IDs
 */
function sendOneSignalNotification(array $osIds, string $title, string $body): void {
    if (empty($osIds)) return;
    $payload = json_encode([
        'app_id'                  => ONESIGNAL_APP_ID,
        'include_player_ids' => array_values($osIds),
        'headings'                => ['en' => $title, 'fr' => $title],
        'contents'                => ['en' => $body,  'fr' => $body],
    ]);
    $ch = curl_init('https://onesignal.com/api/v1/notifications');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . ONESIGNAL_API_KEY,
        ],
    ]);
    $response = curl_exec($ch);
    $httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    file_put_contents(__DIR__ . '/onesignal_debug.log',
        date('Y-m-d H:i:s') . " HTTP:{$httpCode} IDs:" . implode(',', $osIds) . " => " . $response . "\n",
        FILE_APPEND
    );
}

function writeDebug(string $msg): void {
    $logFile = sys_get_temp_dir() . '/jsa_debug.log';
    file_put_contents($logFile, date('H:i:s') . ' ' . $msg . "\n", FILE_APPEND);
    // Aussi dans le dossier courant
    @file_put_contents(__DIR__ . '/jsa_debug.log', date('H:i:s') . ' ' . $msg . "\n", FILE_APPEND);
}

// --- RÉCUPÉRATION DES DONNÉES JSON (Indispensable pour React) ---

$data = json_decode(file_get_contents('php://input'), true);



// L'action peut venir soit de l'URL (GET) soit du JSON (POST)

$action = $_GET['action'] ?? ($data['action'] ?? '');

switch($action) {

    // ── DEBUG : tester la chaîne complète ──────────────────────────────
    case 'debug_notif':
        $result = ['curl_enabled' => function_exists('curl_init')];

        // 1. Écriture fichier
        $wrote = @file_put_contents(__DIR__ . '/jsa_debug.log', "test\n", FILE_APPEND);
        $result['file_write'] = ($wrote !== false) ? 'OK' : 'FAIL (permissions ?)';

        // 2. Récupération onesignal_ids depuis la DB
        $team_id_test = intval($_GET['team_id'] ?? 1);
        $osIds = getTeamOsIds($pdo, $team_id_test);
        $result['team_id']   = $team_id_test;
        $result['os_ids_count'] = count($osIds);
        $result['os_ids']    = $osIds;

        // 3. Appel OneSignal si curl dispo et IDs trouvés
        if ($result['curl_enabled'] && !empty($osIds)) {
            $payload = json_encode([
                'app_id'                   => ONESIGNAL_APP_ID,
                'include_player_ids' => array_values($osIds),
                'headings'                 => ['en' => 'Test JSA', 'fr' => 'Test JSA'],
                'contents'                 => ['en' => '✅ Test notification coach OK', 'fr' => '✅ Test notification coach OK'],
            ]);
            $ch = curl_init('https://onesignal.com/api/v1/notifications');
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST           => true,
                CURLOPT_POSTFIELDS     => $payload,
                CURLOPT_HTTPHEADER     => [
                    'Content-Type: application/json',
                    'Authorization: Bearer ' . ONESIGNAL_API_KEY,
                ],
            ]);
            $response = curl_exec($ch);
            $result['onesignal_http'] = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $result['onesignal_response'] = json_decode($response, true);
            $result['curl_error'] = curl_error($ch);
            curl_close($ch);
        } elseif (empty($osIds)) {
            $result['warning'] = 'Aucun onesignal_id en DB pour cette équipe — les joueurs ne se sont pas connectés à l\'app joueur';
        }

        echo json_encode($result, JSON_PRETTY_PRINT);
        break;

case 'get_player_detailed_notes':
    $pid = isset($_GET['player_id']) ? intval($_GET['player_id']) : 0;
    $date = isset($_GET['date']) ? trim($_GET['date']) : '';
    
    // On utilise exactement la requête qui a marché dans ton phpMyAdmin
    // En ajoutant n.note et n.date_saisie
    $sql = "SELECT 
                n.note, 
                c.nom_critere, 
                c.categorie,
                n.date_saisie 
            FROM JSA_JOUEUR_EVAL_NOTE n
            JOIN JSA_JOUEUR_EVAL c ON n.critere_id = c.id
            WHERE n.player_id = ? 
            AND n.date_saisie = ?
            ORDER BY c.categorie ASC, c.ordre ASC";
    
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$pid, $date]);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Debug de secours si c'est encore vide
        if (empty($results)) {
            // On tente sans la date pour voir si le format YYYY-MM-DD pose problème au PHP
            $test = $pdo->prepare("SELECT date_saisie FROM JSA_JOUEUR_EVAL_NOTE WHERE player_id = ? LIMIT 1");
            $test->execute([$pid]);
            $realDate = $test->fetch();
            echo json_encode([
                "error" => "Aucun résultat trouvé pour cette date précise",
                "date_recue_php" => $date,
                "exemple_date_en_base" => $realDate ? $realDate['date_saisie'] : "Aucune note pour ce joueur"
            ]);
        } else {
            echo json_encode($results);
        }
    } catch (PDOException $e) {
        echo json_encode(["error" => "Erreur SQL : " . $e->getMessage()]);
    }
    break;
    case 'get_categories':
    // On récupère les noms de catégories uniques pour alimenter les listes déroulantes
    $sql = "SELECT DISTINCT categorie 
            FROM JSA_JOUEUR_EVAL 
            WHERE categorie IS NOT NULL AND categorie != '' 
            ORDER BY categorie ASC";
    try {
        $stmt = $pdo->query($sql);
        $res = $stmt->fetchAll(PDO::FETCH_COLUMN); // Récupère juste un tableau de chaînes
        echo json_encode($res);
    } catch (Exception $e) {
        echo json_encode([]);
    }
    break;
    case 'get_player_bilans':
        $joueur_id = intval($_GET['joueur_id']);
        $stmt = $pdo->prepare("SELECT * FROM JSA_JOUEUR_EVAL_BILAN WHERE joueur_id = ? ORDER BY date_session DESC");
        $stmt->execute([$joueur_id]);
        echo json_encode($stmt->fetchAll());
        break;
// ==========================================
    // ACTIONS FORMULAIRES (STRUCTURE JSA)
    // ==========================================
    case 'create_new_form':
        /**
         * CRÉATION D'UN NOUVEAU FORMULAIRE
         * Reçoit le nom et l'ID de l'équipe depuis AdminForms.tsx
         */
        $nom = isset($data['nom_formulaire']) ? trim($data['nom_formulaire']) : '';
        $team_id = isset($data['team_id']) ? intval($data['team_id']) : 0;
        
        if ($nom !== '' && $team_id > 0) {
            $stmt = $pdo->prepare("INSERT INTO JSA_JOUEUR_EVAL_FORMULAIRE (nom_formulaire, team_id) VALUES (?, ?)");
            $success = $stmt->execute([$nom, $team_id]);
            
            // Log de création pour l'admin

            echo json_encode(["status" => $success ? "success" : "error", "id" => $pdo->lastInsertId()]);
        } else {
            echo json_encode(["status" => "error", "message" => "Données incomplètes : nom ou team_id manquant"]);
        }
        break;
    
case 'update_criteria_order_bulk':
        $data = json_decode(file_get_contents('php://input'), true);
        $orders = isset($data['orders']) ? $data['orders'] : [];
        
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("UPDATE JSA_JOUEUR_EVAL SET ordre = ? WHERE id = ?");
            foreach ($orders as $o) {
                $stmt->execute([intval($o['ordre']), intval($o['id'])]);
            }
            $pdo->commit();
            echo json_encode(["status" => "success"]);
        } catch (Exception $e) {
            $pdo->rollBack();
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        break;
case 'get_all_criteria_global':
        // On récupère tout pour la banque globale
        $stmt = $pdo->query("SELECT id, nom_critere, categorie, formulaire_id, ordre FROM JSA_JOUEUR_EVAL ORDER BY ordre ASC, nom_critere ASC");
        echo json_encode($stmt->fetchAll());
        break;

case 'add_to_form':
    /**
     * DRAG & DROP : Ajout d'un critère global à un formulaire spécifique
     */
    $f_id = isset($data['form_id']) ? intval($data['form_id']) : 0;
    $c_id = isset($data['crit_id']) ? intval($data['crit_id']) : 0;
    
    if ($f_id > 0 && $c_id > 0) {
        // On lie le critère au formulaire. Il quitte alors la "banque globale" de gauche.
        $stmt = $pdo->prepare("UPDATE JSA_JOUEUR_EVAL SET formulaire_id = ? WHERE id = ?");
        $success = $stmt->execute([$f_id, $c_id]);
        echo json_encode(["status" => $success ? "success" : "error"]);
    }
    break;

   case 'remove_from_form':
    /**
     * DRAG & DROP : Retrait d'un critère (retourne dans la banque globale)
     */
    $c_id = isset($data['crit_id']) ? intval($data['crit_id']) : 0;
    if ($c_id > 0) {
        // En mettant formulaire_id à NULL, le critère réapparaît dans la colonne de gauche
        $stmt = $pdo->prepare("UPDATE JSA_JOUEUR_EVAL SET formulaire_id = NULL WHERE id = ?");
        $success = $stmt->execute([$c_id]);
        echo json_encode(["status" => $success ? "success" : "error"]);
    }
    break;

    case 'create_global_criterion':
        $stmt = $pdo->prepare("INSERT INTO JSA_JOUEUR_EVAL (nom_critere, categorie, ordre) VALUES (?, ?, 99)");
        $stmt->execute([$data['nom'], $data['categorie']]);
        echo json_encode(["status" => "success"]);
        break;

    case 'move_crit_order':
        $id = $data['crit_id'];
        $dir = $data['direction'];
        $val = ($dir === 'up') ? -1 : 1;
        $stmt = $pdo->prepare("UPDATE JSA_JOUEUR_EVAL SET ordre = ordre + ($val) WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(["status" => "success"]);
        break;
        
    case 'get_all_forms':
        $team_id = isset($_GET['team_id']) ? intval($_GET['team_id']) : 0;
        if ($team_id > 0) {
            $stmt = $pdo->prepare("SELECT id, nom_formulaire, team_id, actif, is_template FROM JSA_JOUEUR_EVAL_FORMULAIRE WHERE team_id = ? ORDER BY nom_formulaire ASC");
            $stmt->execute([$team_id]);
        } else {
            $stmt = $pdo->query("SELECT id, nom_formulaire, team_id, actif, is_template FROM JSA_JOUEUR_EVAL_FORMULAIRE ORDER BY nom_formulaire ASC");
        }
        echo json_encode($stmt->fetchAll());
        break;

    case 'get_available_forms':
        // Uniquement les vrais templates (is_template = 1), toutes équipes confondues
        $stmt = $pdo->query("SELECT id, nom_formulaire, team_id, actif, is_template FROM JSA_JOUEUR_EVAL_FORMULAIRE WHERE is_template = 1 ORDER BY nom_formulaire ASC");
        echo json_encode($stmt->fetchAll());
        break;

    case 'toggle_form_template':
        $form_id = intval($data['form_id'] ?? 0);
        if ($form_id > 0) {
            $pdo->prepare("UPDATE JSA_JOUEUR_EVAL_FORMULAIRE SET is_template = 1 - is_template WHERE id = ?")->execute([$form_id]);
            $row = $pdo->prepare("SELECT is_template FROM JSA_JOUEUR_EVAL_FORMULAIRE WHERE id = ?");
            $row->execute([$form_id]);
            echo json_encode(["status" => "success", "is_template" => intval($row->fetchColumn())]);
        } else {
            echo json_encode(["status" => "error"]);
        }
        break;

    case 'toggle_form_visibility':
        $form_id = intval($data['form_id'] ?? 0);
        if ($form_id > 0) {
            $stmt = $pdo->prepare("UPDATE JSA_JOUEUR_EVAL_FORMULAIRE SET actif = 1 - actif WHERE id = ?");
            $ok = $stmt->execute([$form_id]);
            // Retourne le nouvel état
            $row = $pdo->prepare("SELECT actif FROM JSA_JOUEUR_EVAL_FORMULAIRE WHERE id = ?");
            $row->execute([$form_id]);
            echo json_encode(["status" => "success", "actif" => intval($row->fetchColumn())]);
        } else {
            echo json_encode(["status" => "error"]);
        }
        break;

    case 'delete_form':
        $form_id = intval($data['form_id'] ?? 0);
        if ($form_id > 0) {
            // Remet les critères dans la banque globale (formulaire_id = NULL)
            $pdo->prepare("UPDATE JSA_JOUEUR_EVAL SET formulaire_id = NULL WHERE formulaire_id = ?")->execute([$form_id]);
            $stmt = $pdo->prepare("DELETE FROM JSA_JOUEUR_EVAL_FORMULAIRE WHERE id = ?");
            $ok = $stmt->execute([$form_id]);
            echo json_encode(["status" => $ok ? "success" : "error"]);
        } else {
            echo json_encode(["status" => "error"]);
        }
        break;

    case 'copy_form_to_team':
        $source_id = intval($data['source_form_id'] ?? 0);
        $team_id   = intval($data['team_id'] ?? 0);
        if ($source_id > 0 && $team_id > 0) {
            // 1. Récupérer le formulaire source
            $srcStmt = $pdo->prepare("SELECT nom_formulaire FROM JSA_JOUEUR_EVAL_FORMULAIRE WHERE id = ?");
            $srcStmt->execute([$source_id]);
            $src = $srcStmt->fetch();
            if (!$src) { echo json_encode(["status" => "error", "message" => "Source introuvable"]); break; }

            // 2. Créer le nouveau formulaire
            $pdo->prepare("INSERT INTO JSA_JOUEUR_EVAL_FORMULAIRE (nom_formulaire, team_id, actif) VALUES (?, ?, 1)")
                ->execute([$src['nom_formulaire'] . ' (copie)', $team_id]);
            $new_form_id = intval($pdo->lastInsertId());

            // 3. Copier les critères
            $criStmt = $pdo->prepare("SELECT nom_critere, categorie, ordre FROM JSA_JOUEUR_EVAL WHERE formulaire_id = ? ORDER BY ordre ASC");
            $criStmt->execute([$source_id]);
            $criteria = $criStmt->fetchAll();
            $ins = $pdo->prepare("INSERT INTO JSA_JOUEUR_EVAL (nom_critere, categorie, formulaire_id, ordre) VALUES (?, ?, ?, ?)");
            foreach ($criteria as $c) {
                $ins->execute([$c['nom_critere'], $c['categorie'], $new_form_id, $c['ordre']]);
            }

            echo json_encode(["status" => "success", "new_form_id" => $new_form_id]);
        } else {
            echo json_encode(["status" => "error", "message" => "Paramètres manquants"]);
        }
        break;
    
    case 'get_form_criteria':
    /**
     * RÉCUPÈRE LES CRITÈRES D'UN FORMULAIRE
     * Utilisé pour l'affichage des curseurs côté Joueur et la colonne de droite du Coach
     */
    $form_id = $_GET['form_id'] ?? 0;
    $stmt = $pdo->prepare("SELECT id, nom_critere, categorie, ordre FROM JSA_JOUEUR_EVAL WHERE formulaire_id = ? ORDER BY ordre ASC");
    $stmt->execute([$form_id]);
    echo json_encode($stmt->fetchAll());
    break;

    case 'create_form':
        // Crée un nouveau formulaire
        $nom = $data['nom_formulaire'] ?? '';
        if(!empty($nom)) {
            $stmt = $pdo->prepare("INSERT INTO JSA_JOUEUR_EVAL_FORMULAIRE (nom_formulaire) VALUES (?)");
            $stmt->execute([$nom]);
            echo json_encode(["status" => "success"]);
        } else {
            echo json_encode(["status" => "error", "message" => "Nom vide"]);
        }
        break;

    case 'add_criterion':
        // Ajoute un critère à un formulaire
        $f_id = $data['form_id'] ?? 0;
        $nom_c = $data['nom_critere'] ?? '';
        $cat = $data['categorie'] ?? 'Technique';
        if($f_id > 0 && !empty($nom_c)) {
            $stmt = $pdo->prepare("INSERT INTO JSA_JOUEUR_EVAL (formulaire_id, nom_critere, categorie) VALUES (?, ?, ?)");
            $stmt->execute([$f_id, $nom_c, $cat]);
            echo json_encode(["status" => "success"]);
        }
        break;

    case 'delete_criterion':
        // Supprime un critère
        $id = $_GET['id'] ?? ($data['id'] ?? 0);
        $stmt = $pdo->prepare("DELETE FROM JSA_JOUEUR_EVAL WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(["status" => "success"]);
        break;

    case 'get_history_by_criterion':
        // Récupère l'historique des notes pour le futur graphique
        $p_id = $_GET['player_id'] ?? 0;
        $c_id = $_GET['critere_id'] ?? 0;
        $stmt = $pdo->prepare("SELECT note, date_saisie FROM JSA_JOUEUR_EVAL_NOTE WHERE player_id = ? AND critere_id = ? ORDER BY date_saisie ASC");
        $stmt->execute([$p_id, $c_id]);
        echo json_encode($stmt->fetchAll());
        break;
        
    case 'admin_create_event':
        // On récupère les données du JSON décodé ($data)
        $team_id = intval($data['team_id']);
        $type_event = $data['type_event'];
        $heure_event = $data['heure_event'];
        $heure_fin = $data['heure_fin'] ?? null;
        $lieu = $data['lieu'];
        $adversaire = $data['adversaire'] ?? '';
        $is_recurring = isset($data['is_recurring']) && $data['is_recurring'] === true;

        if ($is_recurring && $type_event === 'Entraînement') {
            $selected_days = $data['selected_days']; // Array [1, 4...]
            
            $now = new DateTime();
            $currentYear = intval($now->format('Y'));
            
            // Saison : du 1er Septembre au 30 Juin
            $start = new DateTime($currentYear . "-09-01");
            if (intval($now->format('n')) < 7) {
                $start->modify('-1 year');
            }
            if ($now > $start) {
                $start = $now;
            }

            $end = new DateTime($start->format('Y'));
            if (intval($start->format('n')) >= 9) {
                $end->modify('+1 year');
            }
            $end->setDate(intval($end->format('Y')), 6, 30);
            $end->modify('+1 day'); 

            $interval = new DateInterval('P1D');
            $period = new DatePeriod($start, $interval, $end);

            $pdo->beginTransaction();
            try {
                foreach ($period as $date) {
                    if (in_array(intval($date->format('w')), $selected_days)) {
                        $sql = "INSERT INTO vt_events (team_id, type_event, date_event, heure_event, heure_fin, lieu, adversaire) 
                                VALUES (?, ?, ?, ?, ?, ?, ?)";
                        $stmt = $pdo->prepare($sql);
                        $stmt->execute([
                            $team_id, $type_event, $date->format('Y-m-d'), 
                            $heure_event, $heure_fin, $lieu, ''
                        ]);
                    }
                }
                $pdo->commit();
                echo json_encode(["status" => "success", "message" => "Saison générée"]);
            } catch (Exception $e) {
                $pdo->rollBack();
                echo json_encode(["status" => "error", "message" => $e->getMessage()]);
            }
        } else {
            // Création unitaire
            $date_event = $data['date_event'];
            $sql = "INSERT INTO vt_events (team_id, type_event, date_event, heure_event, heure_fin, lieu, adversaire)
                    VALUES (?, ?, ?, ?, ?, ?, ?)";
            $stmt = $pdo->prepare($sql);
            $success = $stmt->execute([
                $team_id, $type_event, $date_event,
                $heure_event, $heure_fin, $lieu, $adversaire
            ]);

            // Notification si l'event est dans moins de 7 jours
            if ($success) {
                $daysUntil = (strtotime($date_event) - strtotime('today')) / 86400;
                if ($daysUntil >= 0 && $daysUntil <= 7) {
                    $osIds = getTeamOsIds($pdo, $team_id);
                    if (!empty($osIds)) {
                        $dateFormatted = date('d/m', strtotime($date_event));
                        $heure = substr($heure_event, 0, 5);
                        $title = "Nouvel événement — JSA";
                        $body  = "📅 {$type_event}" . ($adversaire ? " vs {$adversaire}" : "") . " le {$dateFormatted} à {$heure}.";
                        sendOneSignalNotification($osIds, $title, $body);
                    }
                }
            }

            echo json_encode(["status" => $success ? "success" : "error"]);
        }
        break;
    
    case 'get_team_events_admin':
        $team_id = intval($_GET['team_id']);
        $stmt = $pdo->prepare("SELECT * FROM vt_events WHERE team_id = ? ORDER BY date_event DESC, heure_event DESC LIMIT 30");
        $stmt->execute([$team_id]);
        $events = $stmt->fetchAll();
        
        foreach($events as &$e) {
            $stmtP = $pdo->prepare("
                SELECT pl.id as player_id, pl.prenom, COALESCE(pr.statut, 'En attente') as statut
                FROM vt_players pl
                LEFT JOIN vt_event_presence pr ON pl.id = pr.player_id AND pr.event_id = ?
                WHERE pl.team_id = ?
                ORDER BY pl.prenom ASC
            ");
            $stmtP->execute([$e['id'], $team_id]);
            $e['presences'] = $stmtP->fetchAll();
        }
        echo json_encode($events);
        break;

    case 'register_coach':
        // Pour register, on gère les deux formats (FormData et JSON)
        $p = $data['pseudo'] ?? ($_POST['pseudo'] ?? '');
        $pass = $data['password'] ?? ($_POST['password'] ?? '');
        $n = $data['nom'] ?? ($_POST['nom'] ?? '');
        $pr = $data['prenom'] ?? ($_POST['prenom'] ?? '');

        if (!empty($p) && !empty($pass)) {
            try {
                $stmt = $pdo->prepare("INSERT INTO coachs (pseudo, password, nom, prenom, role) VALUES (?, ?, ?, ?, 'coach')");
                $stmt->execute([$p, $pass, $n, $pr]);
                echo json_encode(["status" => "success", "message" => "Coach créé !"]);
            } catch (Exception $e) {
                echo json_encode(["status" => "error", "message" => "Pseudo déjà utilisé"]);
            }
        } else {
            echo json_encode(["status" => "error", "message" => "Champs vides"]);
        }
        break;

    case 'login_coach':
        $p = $data['pseudo'] ?? ($_POST['pseudo'] ?? '');
        $pass = $data['password'] ?? ($_POST['password'] ?? '');
        $stmt = $pdo->prepare("SELECT * FROM coachs WHERE pseudo = ?");
        $stmt->execute([$p]);
        $c = $stmt->fetch();

        if ($c && $pass === $c['password']) {
            echo json_encode([
                "status" => "success",
                "coach" => ["id" => $c['id'], "nom" => $c['nom'], "prenom" => $c['prenom'], "role" => $c['role']]
            ]);
        } else {
            echo json_encode(["status" => "error", "message" => "Identifiants faux"]);
        }
        break;

    case 'get_all_data':
        $coach_id = $_GET['coach_id'] ?? '';
        $stmt = $pdo->prepare("SELECT role, equipes_autorisees FROM coachs WHERE id = ?");
        $stmt->execute([$coach_id]);
        $coach = $stmt->fetch();

        if (!$coach) {
            echo json_encode(["status" => "error", "message" => "Coach non trouvé"]);
            break;
        }

        $whereTeam = ""; $wherePlayer = ""; $whereSess = "";
        if ($coach['role'] !== 'admin') {
            $allowed = !empty($coach['equipes_autorisees']) ? $coach['equipes_autorisees'] : '0';
            $whereTeam = " WHERE id IN ($allowed)";
            $wherePlayer = " WHERE team_id IN ($allowed)";
            $whereSess = " WHERE player_id IN (SELECT id FROM vt_players WHERE team_id IN ($allowed))";
        }

        try {
            $eq = $pdo->query("SELECT * FROM vt_teams $whereTeam ORDER BY nom_equipe ASC")->fetchAll();
            $pl = $pdo->query("SELECT * FROM vt_players $wherePlayer")->fetchAll();
            $se = $pdo->query("SELECT * FROM vt_sessions $whereSess ORDER BY date_session DESC")->fetchAll();

            echo json_encode([
                "status" => "success",
                "equipes" => $eq,
                "joueurs" => $pl,
                "bilans" => $se
            ]);
        } catch (PDOException $e) {
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        break;

    case 'get_all_coachs':
        $coachs = $pdo->query("SELECT id, pseudo, nom, prenom, role, equipes_autorisees, `password` FROM coachs WHERE role != 'admin'")->fetchAll();
        echo json_encode(["status" => "success", "coachs" => $coachs]);
        break;

    case 'delete_coach':
        $target_id = intval($data['coach_id'] ?? 0);
        $admin_id  = intval($data['admin_id'] ?? 0);
        if ($target_id > 0 && $admin_id > 0) {
            $stmt = $pdo->prepare("DELETE FROM coachs WHERE id = ? AND role != 'admin'");
            $ok = $stmt->execute([$target_id]);
            echo json_encode(["status" => $ok ? "success" : "error"]);
        } else {
            echo json_encode(["status" => "error", "message" => "Paramètres manquants"]);
        }
        break;

    case 'get_all_teams_admin':
        $teams = $pdo->query("SELECT * FROM vt_teams ORDER BY nom_equipe ASC")->fetchAll();
        echo json_encode(["status" => "success", "teams" => $teams]);
        break;

    case 'create_team':
        $nom = trim($data['nom_equipe'] ?? '');
        if ($nom !== '') {
            $stmt = $pdo->prepare("INSERT INTO vt_teams (nom_equipe) VALUES (?)");
            $ok = $stmt->execute([$nom]);
            echo json_encode(["status" => $ok ? "success" : "error", "id" => $pdo->lastInsertId()]);
        } else {
            echo json_encode(["status" => "error", "message" => "Nom manquant"]);
        }
        break;

    case 'update_team':
        $id  = intval($data['team_id'] ?? 0);
        $nom = trim($data['nom_equipe'] ?? '');
        if ($id > 0 && $nom !== '') {
            $stmt = $pdo->prepare("UPDATE vt_teams SET nom_equipe = ? WHERE id = ?");
            $ok = $stmt->execute([$nom, $id]);
            echo json_encode(["status" => $ok ? "success" : "error"]);
        } else {
            echo json_encode(["status" => "error", "message" => "Paramètres manquants"]);
        }
        break;

    case 'delete_team':
        $id = intval($data['team_id'] ?? 0);
        if ($id > 0) {
            $stmt = $pdo->prepare("DELETE FROM vt_teams WHERE id = ?");
            $ok = $stmt->execute([$id]);
            echo json_encode(["status" => $ok ? "success" : "error"]);
        } else {
            echo json_encode(["status" => "error", "message" => "ID manquant"]);
        }
        break;

case 'send_team_notification':
    try {
        $team_id = intval($data['team_id'] ?? 0);
        $title   = trim($data['title']   ?? 'JSA Tigres');
        $message = trim($data['message'] ?? '');
        if ($team_id > 0 && $message !== '') {
            $osIds = getTeamOsIds($pdo, $team_id);
            if (!empty($osIds)) {
                sendOneSignalNotification($osIds, $title, $message);
                echo json_encode(["status" => "success", "sent_to" => count($osIds)]);
            } else {
                echo json_encode(["status" => "error", "message" => "Aucun joueur inscrit aux notifications"]);
            }
        } else {
            echo json_encode(["status" => "error", "message" => "Paramètres manquants"]);
        }
    } catch (Exception $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    break;

case 'admin_delete_event':
    $id = intval($data['event_id']);

    // Récupérer infos event + TOUS les joueurs de l'équipe avant suppression
    $evStmt = $pdo->prepare("SELECT type_event, date_event, heure_event, team_id FROM vt_events WHERE id = ?");
    $evStmt->execute([$id]);
    $ev = $evStmt->fetch();

    // Tous les onesignal_id des joueurs de l'équipe
    $osIds = [];
    if ($ev) {
        $osIds = getTeamOsIds($pdo, intval($ev['team_id']));
    }

    // Suppression
    $pdo->prepare("DELETE FROM vt_event_presence WHERE event_id = ?")->execute([$id]);
    $stmt = $pdo->prepare("DELETE FROM vt_events WHERE id = ?");
    $success = $stmt->execute([$id]);

    // Notification OneSignal à tous les joueurs de l'équipe
    if ($success && $ev) {
        $dateFormatted = date('d/m', strtotime($ev['date_event']));
        $heure = substr($ev['heure_event'], 0, 5);
        $message = "❌ {$ev['type_event']} du {$dateFormatted} à {$heure} a été annulé.";
        sendOneSignalNotification($osIds, "Événement annulé — JSA", $message);
    }

    echo json_encode(["status" => $success ? "success" : "error"]);
    break;

case 'admin_clear_future_events':
    $team_id = intval($data['team_id']);
    $today = date('Y-m-d');
    
    try {
        $pdo->beginTransaction();
        
        // 1. On supprime les présences liées aux événements futurs de cette équipe
        $sqlPres = "DELETE FROM vt_event_presence WHERE event_id IN 
                    (SELECT id FROM vt_events WHERE team_id = ? AND date_event >= ?)";
        $stmtPres = $pdo->prepare($sqlPres);
        $stmtPres->execute([$team_id, $today]);

        // 2. On supprime les événements eux-mêmes
        $sqlEv = "DELETE FROM vt_events WHERE team_id = ? AND date_event >= ?";
        $stmtEv = $pdo->prepare($sqlEv);
        $success = $stmtEv->execute([$team_id, $today]);

        $pdo->commit();
        echo json_encode(["status" => "success", "message" => "Calendrier futur nettoyé"]);
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    break;
}