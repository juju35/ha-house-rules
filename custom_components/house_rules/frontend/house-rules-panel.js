// House Rules sidebar panel (administrators): Activity, Rules, Rooms, Journal, Settings.
// Plain web component, no build. Data: house_rules/subscribe; writes: house_rules/* WebSocket commands.
// The panel draws its own content (it does not embed the Lovelace cards).

const HOUSE_RULES_PANEL_VERSION = '1.3.0';

// Naps of a room as one line: "13:30-15:00; sat,sun 14:00-16:00; schedule.nap_bedroom" (days optional, an on/off
// entity such as a `schedule` helper shared with other integrations), both ways. A part that doesn't
// read is kept as written: saving then shows the validation error.
const hrpNapsText = (naps) =>
  (Array.isArray(naps) ? naps : [])
    .map((n) => typeof n === 'string' ? n : `${n.days?.length ? `${[].concat(n.days).join(',')} ` : ''}${n.end ? `${String(n.start).slice(0, 5)}-${String(n.end).slice(0, 5)}` : n.start}`)
    .join('; ');
const hrpNapsParse = (text) =>
  text
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      if (/^[a-z_]+\.[a-z0-9_]+$/.test(part)) return part;
      const m = part.match(/^(?:([a-z,\s]+?)\s+)?(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/i);
      if (!m) return { start: part, end: '' };
      const nap = { start: m[2].padStart(5, '0'), end: m[3].padStart(5, '0') };
      if (m[1]) nap.days = m[1].toLowerCase().split(/[\s,]+/).filter(Boolean);
      return nap;
    });

const HRP_STRINGS = {
  "en": {
    "tabs": {
      "activity": "Activity",
      "rules": "Rules",
      "rooms": "Rooms",
      "journal": "Journal",
      "yaml": "YAML",
      "settings": "Settings"
    },
    "subtitle": "{rules} rules · {alerts} · {timers}",
    "alerts_one": "1 alert",
    "alerts_other": "{n} alerts",
    "no_alert": "no alert",
    "timers_one": "1 timer",
    "timers_other": "{n} timers",
    "no_timer": "no timer",
    "all_good": "All good",
    "in_progress": "In progress",
    "timers": "Timed off",
    "watch": "Watching",
    "latest": "Latest",
    "see_journal": "See the journal",
    "acknowledge": "Acknowledge",
    "snooze15": "Snooze 15 min",
    "resume": "Resume",
    "extend": "+15 min",
    "turn_off": "Turn off",
    "test": "Test",
    "edit": "Edit",
    "delete": "Delete",
    "save": "Save",
    "cancel": "Cancel",
    "close": "Close",
    "new_rule": "New rule",
    "all": "All",
    "rule_yaml": "Rule (YAML)",
    "reloaded": "{file} changed at {time} · {n} rules reloaded",
    "yaml_invalid": "house_rules.yaml is invalid ({where}): {error}. The last valid configuration keeps running; editing is paused.",
    "conflict_title": "The file changed while you were editing",
    "conflict_file": "File",
    "conflict_panel": "Panel",
    "keep_file": "Keep the file",
    "keep_panel": "Keep the panel",
    "confirm_delete": "Delete the rule {name}?",
    "room": "Room",
    "light": "Light",
    "opening": "Opening",
    "climate": "Air conditioner",
    "presence": "Presence",
    "illuminance": "Illuminance",
    "naps": "Naps",
    "add_room": "Add a room",
    "rooms_help": "Room names as the vacuum reports them. Used by the vacuum and presence rules.",
    "remove": "Remove",
    "today": "Today's runs",
    "search": "Search a rule or an entity",
    "failures": "Failures",
    "source": "Configuration source",
    "source_yaml": "YAML",
    "source_storage": "Storage",
    "modified": "Modified at {time}",
    "reload": "Reload",
    "switch_yaml": "Switch to YAML",
    "switch_yaml_help": "Writes /config/house_rules.yaml from the current configuration. The file is the source from then on, editable from both sides.",
    "yaml_help": "Panel saves rewrite only the block of the rule (by id), comments kept, with a .bak copy. Changes made in the file are reloaded within seconds.",
    "conditions": "Global conditions",
    "quiet_hours": "Quiet hours",
    "quiet_help": "Lights and sounds muted, notifications only (for the rules that respect it).",
    "notify": "Default notification target",
    "alarm": "Alarm entity",
    "repairs": "Repairs when a rule gives up",
    "vacation": "Vacation mode",
    "import": "Import",
    "import_help": "Rules proposed from your labels and automations. Imported automations are turned off, never deleted. Smart Comfort's lights on presence too: remove them there once imported.",
    "analyze": "Analyze",
    "import_selected": "Import {n}",
    "nothing_found": "Nothing to import.",
    "yaml_file_help": "The whole {path}, as written. Saving checks the YAML and every rule first, keeps a .bak copy, and only the rules that changed restart.",
    "yaml_includes": "Parts of the configuration come from included files: they are edited in their own files or in the Rules and Rooms tabs.",
    "yaml_storage_help": "The configuration is stored by the integration: this is it as YAML, read only. Switch to YAML to edit it here and in the file.",
    "copied": "Copied",
    "revert": "Revert",
    "unsaved": "Not saved",
    "copy": "Copy",
    "saved": "Saved",
    "people_home": "{n} at home",
    "nobody_home": "Nobody home",
    "ok": "OK",
    "blocked.vacation": "paused (vacation)",
    "blocked.away": "paused (nobody home)",
    "blocked.alarm": "paused (alarm armed)",
    "blocked.nap": "paused (nap)"
  },
  "fr": {
    "tabs": {
      "activity": "Activité",
      "rules": "Règles",
      "rooms": "Pièces",
      "journal": "Journal",
      "yaml": "YAML",
      "settings": "Réglages"
    },
    "subtitle": "{rules} règles · {alerts} · {timers}",
    "alerts_one": "1 alerte",
    "alerts_other": "{n} alertes",
    "no_alert": "aucune alerte",
    "timers_one": "1 minuteur",
    "timers_other": "{n} minuteurs",
    "no_timer": "aucun minuteur",
    "all_good": "Tout va bien",
    "in_progress": "En cours",
    "timers": "Extinctions temporisées",
    "watch": "Surveillance",
    "latest": "Derniers déclenchements",
    "see_journal": "Voir le journal",
    "acknowledge": "Acquitter",
    "snooze15": "Snooze 15 min",
    "resume": "Reprendre",
    "extend": "+15 min",
    "turn_off": "Éteindre",
    "test": "Tester",
    "edit": "Modifier",
    "delete": "Supprimer",
    "save": "Enregistrer",
    "cancel": "Annuler",
    "close": "Fermer",
    "new_rule": "Nouvelle règle",
    "all": "Toutes",
    "rule_yaml": "Règle (YAML)",
    "reloaded": "{file} modifié à {time} · {n} règles rechargées",
    "yaml_invalid": "house_rules.yaml est invalide ({where}) : {error}. La dernière configuration valide continue de tourner ; l'édition est suspendue.",
    "conflict_title": "Le fichier a changé pendant l'édition",
    "conflict_file": "Fichier",
    "conflict_panel": "Panneau",
    "keep_file": "Garder le fichier",
    "keep_panel": "Garder le panneau",
    "confirm_delete": "Supprimer la règle {name} ?",
    "room": "Pièce",
    "light": "Lumière",
    "opening": "Ouverture",
    "climate": "Climatisation",
    "presence": "Présence",
    "illuminance": "Luminosité",
    "naps": "Siestes",
    "add_room": "Ajouter une pièce",
    "rooms_help": "Noms de pièces tels que l'aspirateur les expose. Utilisée par les règles aspirateur et présence.",
    "remove": "Retirer",
    "today": "Déclenchements aujourd'hui",
    "search": "Rechercher une règle ou une entité",
    "failures": "Échecs",
    "source": "Source de la configuration",
    "source_yaml": "YAML",
    "source_storage": "Stockage",
    "modified": "Modifié à {time}",
    "reload": "Recharger",
    "switch_yaml": "Passer en YAML",
    "switch_yaml_help": "Écrit /config/house_rules.yaml depuis la configuration actuelle. Le fichier fait foi ensuite, éditable des deux côtés.",
    "yaml_help": "Chaque enregistrement réécrit uniquement le bloc de la règle (par id), commentaires conservés, avec une copie .bak. Les modifications du fichier sont rechargées en quelques secondes.",
    "conditions": "Conditions globales",
    "quiet_hours": "Plage silencieuse",
    "quiet_help": "Lumières et sons coupés, notification seule (pour les règles qui la respectent).",
    "notify": "Cible de notification par défaut",
    "alarm": "Entité d'alarme",
    "repairs": "Signalement Réparations quand une règle abandonne",
    "vacation": "Mode vacances",
    "import": "Import",
    "import_help": "Règles proposées depuis vos labels et automatisations. Les automatisations importées sont désactivées, jamais supprimées. Ainsi que les lumières sur présence de Smart Comfort : retirez-les-y une fois importées.",
    "analyze": "Analyser",
    "import_selected": "Importer {n}",
    "nothing_found": "Rien à importer.",
    "yaml_file_help": "Tout le fichier {path}, tel qu'il est écrit. L'enregistrement vérifie d'abord le YAML et chaque règle, garde une copie .bak, et seules les règles modifiées redémarrent.",
    "yaml_includes": "Une partie de la configuration vient de fichiers inclus : elle se modifie dans ces fichiers ou dans les onglets Règles et Pièces.",
    "yaml_storage_help": "La configuration est stockée par l'intégration : la voici en YAML, en lecture seule. Passez en YAML pour la modifier ici et dans le fichier.",
    "copied": "Copié",
    "revert": "Annuler les modifications",
    "unsaved": "Non enregistré",
    "copy": "Copier",
    "saved": "Enregistré",
    "people_home": "{n} à la maison",
    "nobody_home": "Personne à la maison",
    "ok": "OK",
    "blocked.vacation": "en pause (vacances)",
    "blocked.away": "en pause (personne à la maison)",
    "blocked.alarm": "en pause (alarme armée)",
    "blocked.nap": "en pause (sieste)"
  },
  "de": {
    "tabs": {
      "activity": "Aktivität",
      "rules": "Regeln",
      "rooms": "Räume",
      "journal": "Protokoll",
      "settings": "Einstellungen",
      "yaml": "YAML"
    },
    "subtitle": "{rules} Regeln · {alerts} · {timers}",
    "alerts_one": "1 Alarm",
    "alerts_other": "{n} Alarme",
    "no_alert": "kein Alarm",
    "timers_one": "1 Timer",
    "timers_other": "{n} Timer",
    "no_timer": "kein Timer",
    "all_good": "Alles in Ordnung",
    "in_progress": "Laufend",
    "timers": "Zeitgesteuert aus",
    "watch": "Überwachung",
    "latest": "Zuletzt",
    "see_journal": "Protokoll ansehen",
    "acknowledge": "Bestätigen",
    "snooze15": "15 Min. pausieren",
    "resume": "Fortsetzen",
    "extend": "+15 min",
    "turn_off": "Ausschalten",
    "test": "Testen",
    "edit": "Bearbeiten",
    "delete": "Löschen",
    "save": "Speichern",
    "cancel": "Abbrechen",
    "close": "Schließen",
    "new_rule": "Neue Regel",
    "all": "Alle",
    "rule_yaml": "Regel (YAML)",
    "reloaded": "{file} um {time} geändert · {n} Regeln neu geladen",
    "yaml_invalid": "house_rules.yaml ist ungültig ({where}): {error}. Die letzte gültige Konfiguration läuft weiter; die Bearbeitung ist pausiert.",
    "conflict_title": "Die Datei wurde während der Bearbeitung geändert",
    "conflict_file": "Datei",
    "conflict_panel": "Panel",
    "keep_file": "Datei behalten",
    "keep_panel": "Panel behalten",
    "confirm_delete": "Regel {name} löschen?",
    "room": "Raum",
    "light": "Licht",
    "opening": "Öffnung",
    "climate": "Klimaanlage",
    "presence": "Anwesenheit",
    "illuminance": "Helligkeit",
    "naps": "Mittagsschlaf",
    "add_room": "Raum hinzufügen",
    "rooms_help": "Raumnamen, wie der Saugroboter sie meldet. Verwendet von den Saugroboter- und Anwesenheitsregeln.",
    "remove": "Entfernen",
    "today": "Auslösungen heute",
    "search": "Regel oder Entität suchen",
    "failures": "Fehler",
    "source": "Quelle der Konfiguration",
    "source_yaml": "YAML",
    "source_storage": "Speicher",
    "modified": "Geändert um {time}",
    "reload": "Neu laden",
    "switch_yaml": "Zu YAML wechseln",
    "switch_yaml_help": "Schreibt /config/house_rules.yaml aus der aktuellen Konfiguration. Danach ist die Datei die Quelle, von beiden Seiten bearbeitbar.",
    "yaml_help": "Beim Speichern im Panel wird nur der Block der Regel (nach id) neu geschrieben, Kommentare bleiben, mit .bak-Kopie. Änderungen in der Datei werden innerhalb von Sekunden neu geladen.",
    "conditions": "Globale Bedingungen",
    "quiet_hours": "Ruhezeit",
    "quiet_help": "Lichter und Töne stumm, nur Benachrichtigungen (für die Regeln, die sie beachten).",
    "notify": "Standard-Benachrichtigungsziel",
    "alarm": "Alarm-Entität",
    "repairs": "Reparatur, wenn eine Regel aufgibt",
    "vacation": "Urlaubsmodus",
    "import": "Import",
    "import_help": "Regeln, vorgeschlagen aus deinen Labels und Automationen. Importierte Automationen werden deaktiviert, nie gelöscht. Auch die Lichter bei Anwesenheit von Smart Comfort: dort nach dem Import entfernen.",
    "analyze": "Analysieren",
    "import_selected": "{n} importieren",
    "nothing_found": "Nichts zu importieren.",
    "yaml_file_help": "Die ganze Datei {path}, wie sie geschrieben ist. Beim Speichern werden zuerst das YAML und jede Regel geprüft, eine .bak-Kopie behalten, und nur geänderte Regeln neu gestartet.",
    "yaml_includes": "Teile der Konfiguration stammen aus eingebundenen Dateien: Sie werden in diesen Dateien oder in den Tabs Regeln und Räume bearbeitet.",
    "yaml_storage_help": "Die Konfiguration wird von der Integration gespeichert: Hier ist sie als YAML, schreibgeschützt. Wechsle zu YAML, um sie hier und in der Datei zu bearbeiten.",
    "copied": "Kopiert",
    "revert": "Änderungen verwerfen",
    "unsaved": "Nicht gespeichert",
    "copy": "Kopieren",
    "saved": "Gespeichert",
    "people_home": "{n} zu Hause",
    "nobody_home": "Niemand zu Hause",
    "ok": "OK",
    "blocked.vacation": "pausiert (Urlaub)",
    "blocked.away": "pausiert (niemand zu Hause)",
    "blocked.alarm": "pausiert (Alarm scharf)",
    "blocked.nap": "pausiert (Mittagsschlaf)"
  },
  "es": {
    "tabs": {
      "activity": "Actividad",
      "rules": "Reglas",
      "rooms": "Habitaciones",
      "journal": "Registro",
      "settings": "Ajustes",
      "yaml": "YAML"
    },
    "subtitle": "{rules} reglas · {alerts} · {timers}",
    "alerts_one": "1 alerta",
    "alerts_other": "{n} alertas",
    "no_alert": "sin alertas",
    "timers_one": "1 temporizador",
    "timers_other": "{n} temporizadores",
    "no_timer": "sin temporizador",
    "all_good": "Todo bien",
    "in_progress": "En curso",
    "timers": "Apagados temporizados",
    "watch": "Vigilancia",
    "latest": "Últimas activaciones",
    "see_journal": "Ver el registro",
    "acknowledge": "Confirmar",
    "snooze15": "Pausar 15 min",
    "resume": "Reanudar",
    "extend": "+15 min",
    "turn_off": "Apagar",
    "test": "Probar",
    "edit": "Editar",
    "delete": "Eliminar",
    "save": "Guardar",
    "cancel": "Cancelar",
    "close": "Cerrar",
    "new_rule": "Nueva regla",
    "all": "Todas",
    "rule_yaml": "Regla (YAML)",
    "reloaded": "{file} cambió a las {time} · {n} reglas recargadas",
    "yaml_invalid": "house_rules.yaml no es válido ({where}): {error}. La última configuración válida sigue funcionando; la edición está en pausa.",
    "conflict_title": "El archivo cambió mientras editabas",
    "conflict_file": "Archivo",
    "conflict_panel": "Panel",
    "keep_file": "Conservar el archivo",
    "keep_panel": "Conservar el panel",
    "confirm_delete": "¿Eliminar la regla {name}?",
    "room": "Habitación",
    "light": "Luz",
    "opening": "Apertura",
    "climate": "Aire acondicionado",
    "presence": "Presencia",
    "illuminance": "Luminosidad",
    "naps": "Siestas",
    "add_room": "Añadir una habitación",
    "rooms_help": "Nombres de las habitaciones tal como los indica el robot. Los usan las reglas del robot y de presencia.",
    "remove": "Quitar",
    "today": "Activaciones hoy",
    "search": "Buscar una regla o una entidad",
    "failures": "Fallos",
    "source": "Origen de la configuración",
    "source_yaml": "YAML",
    "source_storage": "Almacenamiento",
    "modified": "Modificado a las {time}",
    "reload": "Recargar",
    "switch_yaml": "Pasar a YAML",
    "switch_yaml_help": "Escribe /config/house_rules.yaml a partir de la configuración actual. A partir de entonces el archivo es la fuente, editable desde ambos lados.",
    "yaml_help": "Al guardar en el panel solo se reescribe el bloque de la regla (por id), con los comentarios y una copia .bak. Los cambios hechos en el archivo se recargan en unos segundos.",
    "conditions": "Condiciones globales",
    "quiet_hours": "Horas de silencio",
    "quiet_help": "Luces y sonidos silenciados, solo notificaciones (para las reglas que las respetan).",
    "notify": "Destino de notificación por defecto",
    "alarm": "Entidad de alarma",
    "repairs": "Aviso en Reparaciones cuando una regla se rinde",
    "vacation": "Modo vacaciones",
    "import": "Importar",
    "import_help": "Reglas propuestas a partir de tus etiquetas y automatizaciones. Las automatizaciones importadas se desactivan, nunca se eliminan. También las luces por presencia de Smart Comfort: quítalas allí una vez importadas.",
    "analyze": "Analizar",
    "import_selected": "Importar {n}",
    "nothing_found": "Nada que importar.",
    "yaml_file_help": "Todo el archivo {path}, tal como está escrito. Al guardar se comprueban primero el YAML y cada regla, se guarda una copia .bak y solo se reinician las reglas cambiadas.",
    "yaml_includes": "Partes de la configuración vienen de archivos incluidos: se editan en esos archivos o en las pestañas Reglas y Habitaciones.",
    "yaml_storage_help": "La configuración la guarda la integración: aquí está en YAML, de solo lectura. Pasa a YAML para editarla aquí y en el archivo.",
    "copied": "Copiado",
    "revert": "Descartar cambios",
    "unsaved": "Sin guardar",
    "copy": "Copiar",
    "saved": "Guardado",
    "people_home": "{n} en casa",
    "nobody_home": "Nadie en casa",
    "ok": "OK",
    "blocked.vacation": "en pausa (vacaciones)",
    "blocked.away": "en pausa (nadie en casa)",
    "blocked.alarm": "en pausa (alarma armada)",
    "blocked.nap": "en pausa (siesta)"
  },
  "it": {
    "tabs": {
      "activity": "Attività",
      "rules": "Regole",
      "rooms": "Stanze",
      "journal": "Registro",
      "settings": "Impostazioni",
      "yaml": "YAML"
    },
    "subtitle": "{rules} regole · {alerts} · {timers}",
    "alerts_one": "1 allarme",
    "alerts_other": "{n} allarmi",
    "no_alert": "nessun allarme",
    "timers_one": "1 timer",
    "timers_other": "{n} timer",
    "no_timer": "nessun timer",
    "all_good": "Tutto ok",
    "in_progress": "In corso",
    "timers": "Spegnimenti a tempo",
    "watch": "Sorveglianza",
    "latest": "Ultime attivazioni",
    "see_journal": "Vedi il registro",
    "acknowledge": "Conferma",
    "snooze15": "Pausa 15 min",
    "resume": "Riprendi",
    "extend": "+15 min",
    "turn_off": "Spegni",
    "test": "Prova",
    "edit": "Modifica",
    "delete": "Elimina",
    "save": "Salva",
    "cancel": "Annulla",
    "close": "Chiudi",
    "new_rule": "Nuova regola",
    "all": "Tutte",
    "rule_yaml": "Regola (YAML)",
    "reloaded": "{file} modificato alle {time} · {n} regole ricaricate",
    "yaml_invalid": "house_rules.yaml non è valido ({where}): {error}. L'ultima configurazione valida continua a funzionare; la modifica è sospesa.",
    "conflict_title": "Il file è cambiato durante la modifica",
    "conflict_file": "File",
    "conflict_panel": "Pannello",
    "keep_file": "Tieni il file",
    "keep_panel": "Tieni il pannello",
    "confirm_delete": "Eliminare la regola {name}?",
    "room": "Stanza",
    "light": "Luce",
    "opening": "Apertura",
    "climate": "Condizionatore",
    "presence": "Presenza",
    "illuminance": "Luminosità",
    "naps": "Riposini",
    "add_room": "Aggiungi una stanza",
    "rooms_help": "Nomi delle stanze come li riporta il robot. Usati dalle regole del robot e di presenza.",
    "remove": "Rimuovi",
    "today": "Attivazioni di oggi",
    "search": "Cerca una regola o un'entità",
    "failures": "Errori",
    "source": "Origine della configurazione",
    "source_yaml": "YAML",
    "source_storage": "Archivio",
    "modified": "Modificato alle {time}",
    "reload": "Ricarica",
    "switch_yaml": "Passa a YAML",
    "switch_yaml_help": "Scrive /config/house_rules.yaml dalla configurazione attuale. Da quel momento il file è la fonte, modificabile da entrambe le parti.",
    "yaml_help": "Il salvataggio nel pannello riscrive solo il blocco della regola (per id), commenti conservati, con una copia .bak. Le modifiche fatte nel file vengono ricaricate in pochi secondi.",
    "conditions": "Condizioni globali",
    "quiet_hours": "Ore di silenzio",
    "quiet_help": "Luci e suoni disattivati, solo notifiche (per le regole che le rispettano).",
    "notify": "Destinazione di notifica predefinita",
    "alarm": "Entità allarme",
    "repairs": "Segnalazione in Riparazioni quando una regola si arrende",
    "vacation": "Modalità vacanza",
    "import": "Importa",
    "import_help": "Regole proposte dalle tue etichette e automazioni. Le automazioni importate vengono disattivate, mai eliminate. Anche le luci a presenza di Smart Comfort: rimuovile lì una volta importate.",
    "analyze": "Analizza",
    "import_selected": "Importa {n}",
    "nothing_found": "Niente da importare.",
    "yaml_file_help": "L'intero {path}, così com'è scritto. Il salvataggio controlla prima lo YAML e ogni regola, conserva una copia .bak e riavvia solo le regole cambiate.",
    "yaml_includes": "Parti della configurazione provengono da file inclusi: si modificano in quei file o nelle schede Regole e Stanze.",
    "yaml_storage_help": "La configurazione è salvata dall'integrazione: eccola in YAML, in sola lettura. Passa a YAML per modificarla qui e nel file.",
    "copied": "Copiato",
    "revert": "Annulla le modifiche",
    "unsaved": "Non salvato",
    "copy": "Copia",
    "saved": "Salvato",
    "people_home": "{n} in casa",
    "nobody_home": "Nessuno in casa",
    "ok": "OK",
    "blocked.vacation": "in pausa (vacanza)",
    "blocked.away": "in pausa (nessuno in casa)",
    "blocked.alarm": "in pausa (allarme inserito)",
    "blocked.nap": "in pausa (riposino)"
  },
  "nl": {
    "tabs": {
      "activity": "Activiteit",
      "rules": "Regels",
      "rooms": "Ruimtes",
      "journal": "Logboek",
      "settings": "Instellingen",
      "yaml": "YAML"
    },
    "subtitle": "{rules} regels · {alerts} · {timers}",
    "alerts_one": "1 alarm",
    "alerts_other": "{n} alarmen",
    "no_alert": "geen alarm",
    "timers_one": "1 timer",
    "timers_other": "{n} timers",
    "no_timer": "geen timer",
    "all_good": "Alles in orde",
    "in_progress": "Bezig",
    "timers": "Getimed uit",
    "watch": "Bewaking",
    "latest": "Laatste",
    "see_journal": "Logboek bekijken",
    "acknowledge": "Bevestigen",
    "snooze15": "15 min pauzeren",
    "resume": "Hervatten",
    "extend": "+15 min",
    "turn_off": "Uitzetten",
    "test": "Testen",
    "edit": "Bewerken",
    "delete": "Verwijderen",
    "save": "Opslaan",
    "cancel": "Annuleren",
    "close": "Sluiten",
    "new_rule": "Nieuwe regel",
    "all": "Alle",
    "rule_yaml": "Regel (YAML)",
    "reloaded": "{file} gewijzigd om {time} · {n} regels opnieuw geladen",
    "yaml_invalid": "house_rules.yaml is ongeldig ({where}): {error}. De laatste geldige configuratie blijft draaien; bewerken is gepauzeerd.",
    "conflict_title": "Het bestand is gewijzigd tijdens het bewerken",
    "conflict_file": "Bestand",
    "conflict_panel": "Paneel",
    "keep_file": "Bestand behouden",
    "keep_panel": "Paneel behouden",
    "confirm_delete": "Regel {name} verwijderen?",
    "room": "Ruimte",
    "light": "Lamp",
    "opening": "Opening",
    "climate": "Airco",
    "presence": "Aanwezigheid",
    "illuminance": "Lichtsterkte",
    "naps": "Dutjes",
    "add_room": "Ruimte toevoegen",
    "rooms_help": "Namen van ruimtes zoals de robot ze meldt. Gebruikt door de robot- en aanwezigheidsregels.",
    "remove": "Verwijderen",
    "today": "Uitvoeringen vandaag",
    "search": "Zoek een regel of entiteit",
    "failures": "Fouten",
    "source": "Bron van de configuratie",
    "source_yaml": "YAML",
    "source_storage": "Opslag",
    "modified": "Gewijzigd om {time}",
    "reload": "Opnieuw laden",
    "switch_yaml": "Overschakelen naar YAML",
    "switch_yaml_help": "Schrijft /config/house_rules.yaml vanuit de huidige configuratie. Daarna is het bestand de bron, aan beide kanten te bewerken.",
    "yaml_help": "Opslaan in het paneel herschrijft alleen het blok van de regel (op id), met behoud van commentaar en een .bak-kopie. Wijzigingen in het bestand worden binnen enkele seconden opnieuw geladen.",
    "conditions": "Algemene voorwaarden",
    "quiet_hours": "Stille uren",
    "quiet_help": "Lampen en geluid gedempt, alleen meldingen (voor de regels die ze respecteren).",
    "notify": "Standaard meldingsdoel",
    "alarm": "Alarmentiteit",
    "repairs": "Reparatiemelding als een regel opgeeft",
    "vacation": "Vakantiemodus",
    "import": "Importeren",
    "import_help": "Regels voorgesteld op basis van je labels en automatiseringen. Geïmporteerde automatiseringen worden uitgeschakeld, nooit verwijderd. Ook de lampen bij aanwezigheid van Smart Comfort: verwijder ze daar na het importeren.",
    "analyze": "Analyseren",
    "import_selected": "{n} importeren",
    "nothing_found": "Niets te importeren.",
    "yaml_file_help": "Het hele bestand {path}, zoals het geschreven is. Bij opslaan worden eerst de YAML en elke regel gecontroleerd, een .bak-kopie bewaard en alleen gewijzigde regels herstart.",
    "yaml_includes": "Delen van de configuratie komen uit ingevoegde bestanden: die bewerk je in die bestanden of in de tabbladen Regels en Ruimtes.",
    "yaml_storage_help": "De configuratie wordt door de integratie opgeslagen: hier staat ze als YAML, alleen-lezen. Schakel over naar YAML om ze hier en in het bestand te bewerken.",
    "copied": "Gekopieerd",
    "revert": "Wijzigingen ongedaan maken",
    "unsaved": "Niet opgeslagen",
    "copy": "Kopiëren",
    "saved": "Opgeslagen",
    "people_home": "{n} thuis",
    "nobody_home": "Niemand thuis",
    "ok": "OK",
    "blocked.vacation": "gepauzeerd (vakantie)",
    "blocked.away": "gepauzeerd (niemand thuis)",
    "blocked.alarm": "gepauzeerd (alarm ingeschakeld)",
    "blocked.nap": "gepauzeerd (dutje)"
  },
  "pt": {
    "tabs": {
      "activity": "Atividade",
      "rules": "Regras",
      "rooms": "Divisões",
      "journal": "Registo",
      "settings": "Definições",
      "yaml": "YAML"
    },
    "subtitle": "{rules} regras · {alerts} · {timers}",
    "alerts_one": "1 alerta",
    "alerts_other": "{n} alertas",
    "no_alert": "sem alertas",
    "timers_one": "1 temporizador",
    "timers_other": "{n} temporizadores",
    "no_timer": "sem temporizador",
    "all_good": "Tudo bem",
    "in_progress": "Em curso",
    "timers": "Desligar temporizado",
    "watch": "Vigilância",
    "latest": "Últimas ativações",
    "see_journal": "Ver o registo",
    "acknowledge": "Confirmar",
    "snooze15": "Pausar 15 min",
    "resume": "Retomar",
    "extend": "+15 min",
    "turn_off": "Desligar",
    "test": "Testar",
    "edit": "Editar",
    "delete": "Eliminar",
    "save": "Guardar",
    "cancel": "Cancelar",
    "close": "Fechar",
    "new_rule": "Nova regra",
    "all": "Todas",
    "rule_yaml": "Regra (YAML)",
    "reloaded": "{file} alterado às {time} · {n} regras recarregadas",
    "yaml_invalid": "house_rules.yaml é inválido ({where}): {error}. A última configuração válida continua a funcionar; a edição está em pausa.",
    "conflict_title": "O ficheiro mudou durante a edição",
    "conflict_file": "Ficheiro",
    "conflict_panel": "Painel",
    "keep_file": "Manter o ficheiro",
    "keep_panel": "Manter o painel",
    "confirm_delete": "Eliminar a regra {name}?",
    "room": "Divisão",
    "light": "Luz",
    "opening": "Abertura",
    "climate": "Ar condicionado",
    "presence": "Presença",
    "illuminance": "Luminosidade",
    "naps": "Sestas",
    "add_room": "Adicionar uma divisão",
    "rooms_help": "Nomes das divisões tal como o robô os indica. Usados pelas regras do robô e de presença.",
    "remove": "Remover",
    "today": "Ativações de hoje",
    "search": "Procurar uma regra ou uma entidade",
    "failures": "Falhas",
    "source": "Origem da configuração",
    "source_yaml": "YAML",
    "source_storage": "Armazenamento",
    "modified": "Alterado às {time}",
    "reload": "Recarregar",
    "switch_yaml": "Passar para YAML",
    "switch_yaml_help": "Escreve /config/house_rules.yaml a partir da configuração atual. A partir daí o ficheiro é a fonte, editável dos dois lados.",
    "yaml_help": "Guardar no painel reescreve apenas o bloco da regra (por id), com os comentários e uma cópia .bak. As alterações feitas no ficheiro são recarregadas em segundos.",
    "conditions": "Condições globais",
    "quiet_hours": "Horas de silêncio",
    "quiet_help": "Luzes e sons silenciados, apenas notificações (para as regras que as respeitam).",
    "notify": "Destino de notificação predefinido",
    "alarm": "Entidade de alarme",
    "repairs": "Aviso em Reparações quando uma regra desiste",
    "vacation": "Modo férias",
    "import": "Importar",
    "import_help": "Regras propostas a partir das suas etiquetas e automatizações. As automatizações importadas são desativadas, nunca eliminadas. Também as luzes por presença do Smart Comfort: remova-as lá depois de importadas.",
    "analyze": "Analisar",
    "import_selected": "Importar {n}",
    "nothing_found": "Nada para importar.",
    "yaml_file_help": "Todo o ficheiro {path}, tal como está escrito. Guardar verifica primeiro o YAML e cada regra, mantém uma cópia .bak e só reinicia as regras alteradas.",
    "yaml_includes": "Partes da configuração vêm de ficheiros incluídos: editam-se nesses ficheiros ou nos separadores Regras e Divisões.",
    "yaml_storage_help": "A configuração é guardada pela integração: aqui está em YAML, só de leitura. Passe para YAML para a editar aqui e no ficheiro.",
    "copied": "Copiado",
    "revert": "Anular alterações",
    "unsaved": "Não guardado",
    "copy": "Copiar",
    "saved": "Guardado",
    "people_home": "{n} em casa",
    "nobody_home": "Ninguém em casa",
    "ok": "OK",
    "blocked.vacation": "em pausa (férias)",
    "blocked.away": "em pausa (ninguém em casa)",
    "blocked.alarm": "em pausa (alarme armado)",
    "blocked.nap": "em pausa (sesta)"
  },
  "pl": {
    "tabs": {
      "activity": "Aktywność",
      "rules": "Reguły",
      "rooms": "Pomieszczenia",
      "journal": "Dziennik",
      "settings": "Ustawienia",
      "yaml": "YAML"
    },
    "subtitle": "Reguły: {rules} · {alerts} · {timers}",
    "alerts_one": "1 alarm",
    "alerts_other": "Alarmy: {n}",
    "no_alert": "brak alarmów",
    "timers_one": "1 minutnik",
    "timers_other": "Minutniki: {n}",
    "no_timer": "brak minutników",
    "all_good": "Wszystko w porządku",
    "in_progress": "W toku",
    "timers": "Wyłączanie po czasie",
    "watch": "Nadzór",
    "latest": "Ostatnie",
    "see_journal": "Zobacz dziennik",
    "acknowledge": "Potwierdź",
    "snooze15": "Wstrzymaj na 15 min",
    "resume": "Wznów",
    "extend": "+15 min",
    "turn_off": "Wyłącz",
    "test": "Testuj",
    "edit": "Edytuj",
    "delete": "Usuń",
    "save": "Zapisz",
    "cancel": "Anuluj",
    "close": "Zamknij",
    "new_rule": "Nowa reguła",
    "all": "Wszystkie",
    "rule_yaml": "Reguła (YAML)",
    "reloaded": "{file} zmieniony o {time} · przeładowane reguły: {n}",
    "yaml_invalid": "house_rules.yaml jest nieprawidłowy ({where}): {error}. Ostatnia poprawna konfiguracja nadal działa; edycja jest wstrzymana.",
    "conflict_title": "Plik zmienił się podczas edycji",
    "conflict_file": "Plik",
    "conflict_panel": "Panel",
    "keep_file": "Zachowaj plik",
    "keep_panel": "Zachowaj panel",
    "confirm_delete": "Usunąć regułę {name}?",
    "room": "Pomieszczenie",
    "light": "Światło",
    "opening": "Otwarcie",
    "climate": "Klimatyzator",
    "presence": "Obecność",
    "illuminance": "Natężenie światła",
    "naps": "Drzemki",
    "add_room": "Dodaj pomieszczenie",
    "rooms_help": "Nazwy pomieszczeń tak, jak podaje je robot. Używane przez reguły robota i obecności.",
    "remove": "Usuń",
    "today": "Uruchomienia dzisiaj",
    "search": "Szukaj reguły lub encji",
    "failures": "Błędy",
    "source": "Źródło konfiguracji",
    "source_yaml": "YAML",
    "source_storage": "Pamięć",
    "modified": "Zmieniono o {time}",
    "reload": "Przeładuj",
    "switch_yaml": "Przejdź na YAML",
    "switch_yaml_help": "Zapisuje /config/house_rules.yaml z bieżącej konfiguracji. Od tej chwili plik jest źródłem, edytowalnym z obu stron.",
    "yaml_help": "Zapis w panelu przepisuje tylko blok reguły (według id), z zachowaniem komentarzy i kopią .bak. Zmiany w pliku są wczytywane w ciągu kilku sekund.",
    "conditions": "Warunki globalne",
    "quiet_hours": "Godziny ciszy",
    "quiet_help": "Światła i dźwięki wyciszone, tylko powiadomienia (dla reguł, które je respektują).",
    "notify": "Domyślny cel powiadomień",
    "alarm": "Encja alarmu",
    "repairs": "Zgłoszenie w Naprawach, gdy reguła się poddaje",
    "vacation": "Tryb urlopowy",
    "import": "Import",
    "import_help": "Reguły zaproponowane na podstawie etykiet i automatyzacji. Zaimportowane automatyzacje są wyłączane, nigdy usuwane. Także światła przy obecności ze Smart Comfort: po imporcie usuń je tam.",
    "analyze": "Analizuj",
    "import_selected": "Importuj ({n})",
    "nothing_found": "Nic do zaimportowania.",
    "yaml_file_help": "Cały plik {path}, tak jak jest zapisany. Zapis najpierw sprawdza YAML i każdą regułę, zachowuje kopię .bak i uruchamia ponownie tylko zmienione reguły.",
    "yaml_includes": "Część konfiguracji pochodzi z dołączonych plików: edytuje się je w tych plikach lub w kartach Reguły i Pomieszczenia.",
    "yaml_storage_help": "Konfiguracja jest przechowywana przez integrację: oto ona w YAML, tylko do odczytu. Przejdź na YAML, aby edytować ją tutaj i w pliku.",
    "copied": "Skopiowano",
    "revert": "Cofnij zmiany",
    "unsaved": "Niezapisane",
    "copy": "Kopiuj",
    "saved": "Zapisano",
    "people_home": "W domu: {n}",
    "nobody_home": "Nikogo w domu",
    "ok": "OK",
    "blocked.vacation": "wstrzymana (urlop)",
    "blocked.away": "wstrzymana (nikogo w domu)",
    "blocked.alarm": "wstrzymana (alarm uzbrojony)",
    "blocked.nap": "wstrzymane (drzemka)"
  },
  "sr": {
    "tabs": {
      "activity": "Активност",
      "rules": "Правила",
      "rooms": "Просторије",
      "journal": "Дневник",
      "settings": "Подешавања",
      "yaml": "YAML"
    },
    "subtitle": "Правила: {rules} · {alerts} · {timers}",
    "alerts_one": "1 узбуна",
    "alerts_other": "Узбуне: {n}",
    "no_alert": "нема узбуна",
    "timers_one": "1 тајмер",
    "timers_other": "Тајмери: {n}",
    "no_timer": "нема тајмера",
    "all_good": "Све је у реду",
    "in_progress": "У току",
    "timers": "Искључења тајмером",
    "watch": "Надзор",
    "latest": "Последње",
    "see_journal": "Погледај дневник",
    "acknowledge": "Потврди",
    "snooze15": "Пауза 15 мин",
    "resume": "Настави",
    "extend": "+15 min",
    "turn_off": "Искључи",
    "test": "Тестирај",
    "edit": "Уреди",
    "delete": "Обриши",
    "save": "Сачувај",
    "cancel": "Откажи",
    "close": "Затвори",
    "new_rule": "Ново правило",
    "all": "Све",
    "rule_yaml": "Правило (YAML)",
    "reloaded": "{file} измењен у {time} · поново учитана правила: {n}",
    "yaml_invalid": "house_rules.yaml није исправан ({where}): {error}. Последња исправна конфигурација и даље ради; измене су паузиране.",
    "conflict_title": "Датотека се променила током уређивања",
    "conflict_file": "Датотека",
    "conflict_panel": "Панел",
    "keep_file": "Задржи датотеку",
    "keep_panel": "Задржи панел",
    "confirm_delete": "Обрисати правило {name}?",
    "room": "Просторија",
    "light": "Светло",
    "opening": "Отвор",
    "climate": "Клима",
    "presence": "Присуство",
    "illuminance": "Осветљеност",
    "naps": "Дремке",
    "add_room": "Додај просторију",
    "rooms_help": "Називи просторија онако како их робот пријављује. Користе их правила робота и присуства.",
    "remove": "Уклони",
    "today": "Данашња покретања",
    "search": "Тражи правило или ентитет",
    "failures": "Неуспеси",
    "source": "Извор конфигурације",
    "source_yaml": "YAML",
    "source_storage": "Складиште",
    "modified": "Измењено у {time}",
    "reload": "Поново учитај",
    "switch_yaml": "Пређи на YAML",
    "switch_yaml_help": "Уписује /config/house_rules.yaml из тренутне конфигурације. Од тада је извор датотека, коју је могуће уређивати са обе стране.",
    "yaml_help": "Чување у панелу преписује само блок правила (по id), коментари остају, уз копију .bak. Измене у датотеци се учитавају за неколико секунди.",
    "conditions": "Општи услови",
    "quiet_hours": "Тихи сати",
    "quiet_help": "Светла и звуци утишани, само обавештења (за правила која их поштују).",
    "notify": "Подразумевани прималац обавештења",
    "alarm": "Ентитет аларма",
    "repairs": "Пријава у Поправкама када правило одустане",
    "vacation": "Режим одмора",
    "import": "Увоз",
    "import_help": "Правила предложена на основу ваших ознака и аутоматизација. Увезене аутоматизације се искључују, никада бришу. Такође и светла на присуство из Smart Comfort: уклоните их тамо након увоза.",
    "analyze": "Анализирај",
    "import_selected": "Увези ({n})",
    "nothing_found": "Нема ничега за увоз.",
    "yaml_file_help": "Цео {path}, онако како је написан. Чување прво проверава YAML и свако правило, задржава копију .bak и поново покреће само измењена правила.",
    "yaml_includes": "Делови конфигурације долазе из укључених датотека: уређују се у тим датотекама или на картицама Правила и Просторије.",
    "yaml_storage_help": "Конфигурацију чува интеграција: овде је у YAML, само за читање. Пређите на YAML да бисте је уређивали овде и у датотеци.",
    "copied": "Копирано",
    "revert": "Одбаци измене",
    "unsaved": "Није сачувано",
    "copy": "Копирај",
    "saved": "Сачувано",
    "people_home": "Код куће: {n}",
    "nobody_home": "Нико није код куће",
    "ok": "OK",
    "blocked.vacation": "паузирано (одмор)",
    "blocked.away": "паузирано (нико није код куће)",
    "blocked.alarm": "паузирано (аларм активан)",
    "blocked.nap": "паузирано (дремка)"
  },
  "ro": {
    "tabs": {
      "activity": "Activitate",
      "rules": "Reguli",
      "rooms": "Camere",
      "journal": "Jurnal",
      "settings": "Setări",
      "yaml": "YAML"
    },
    "subtitle": "Reguli: {rules} · {alerts} · {timers}",
    "alerts_one": "1 alertă",
    "alerts_other": "Alerte: {n}",
    "no_alert": "nicio alertă",
    "timers_one": "1 cronometru",
    "timers_other": "Cronometre: {n}",
    "no_timer": "niciun cronometru",
    "all_good": "Totul e în regulă",
    "in_progress": "În curs",
    "timers": "Opriri temporizate",
    "watch": "Supraveghere",
    "latest": "Ultimele",
    "see_journal": "Vezi jurnalul",
    "acknowledge": "Confirmă",
    "snooze15": "Pauză 15 min",
    "resume": "Reia",
    "extend": "+15 min",
    "turn_off": "Oprește",
    "test": "Testează",
    "edit": "Editează",
    "delete": "Șterge",
    "save": "Salvează",
    "cancel": "Anulează",
    "close": "Închide",
    "new_rule": "Regulă nouă",
    "all": "Toate",
    "rule_yaml": "Regulă (YAML)",
    "reloaded": "{file} modificat la {time} · reguli reîncărcate: {n}",
    "yaml_invalid": "house_rules.yaml nu este valid ({where}): {error}. Ultima configurație validă continuă să ruleze; editarea este în pauză.",
    "conflict_title": "Fișierul s-a schimbat în timpul editării",
    "conflict_file": "Fișier",
    "conflict_panel": "Panou",
    "keep_file": "Păstrează fișierul",
    "keep_panel": "Păstrează panoul",
    "confirm_delete": "Ștergi regula {name}?",
    "room": "Cameră",
    "light": "Lumină",
    "opening": "Deschidere",
    "climate": "Aer condiționat",
    "presence": "Prezență",
    "illuminance": "Luminozitate",
    "naps": "Somnul de prânz",
    "add_room": "Adaugă o cameră",
    "rooms_help": "Numele camerelor așa cum le raportează robotul. Folosite de regulile robotului și de prezență.",
    "remove": "Elimină",
    "today": "Declanșări azi",
    "search": "Caută o regulă sau o entitate",
    "failures": "Eșecuri",
    "source": "Sursa configurației",
    "source_yaml": "YAML",
    "source_storage": "Stocare",
    "modified": "Modificat la {time}",
    "reload": "Reîncarcă",
    "switch_yaml": "Treci la YAML",
    "switch_yaml_help": "Scrie /config/house_rules.yaml din configurația actuală. De atunci fișierul este sursa, editabil din ambele părți.",
    "yaml_help": "Salvarea din panou rescrie doar blocul regulii (după id), cu comentariile păstrate și o copie .bak. Modificările făcute în fișier sunt reîncărcate în câteva secunde.",
    "conditions": "Condiții globale",
    "quiet_hours": "Ore de liniște",
    "quiet_help": "Lumini și sunete oprite, doar notificări (pentru regulile care le respectă).",
    "notify": "Destinație implicită a notificărilor",
    "alarm": "Entitate de alarmă",
    "repairs": "Semnalare în Reparații când o regulă renunță",
    "vacation": "Mod vacanță",
    "import": "Import",
    "import_help": "Reguli propuse din etichetele și automatizările tale. Automatizările importate sunt dezactivate, niciodată șterse. De asemenea, luminile la prezență din Smart Comfort: elimină-le de acolo după import.",
    "analyze": "Analizează",
    "import_selected": "Importă ({n})",
    "nothing_found": "Nimic de importat.",
    "yaml_file_help": "Tot fișierul {path}, așa cum este scris. Salvarea verifică mai întâi YAML-ul și fiecare regulă, păstrează o copie .bak și repornește doar regulile modificate.",
    "yaml_includes": "Părți din configurație provin din fișiere incluse: se editează în acele fișiere sau în filele Reguli și Camere.",
    "yaml_storage_help": "Configurația este stocată de integrare: iat-o în YAML, doar pentru citire. Treci la YAML pentru a o edita aici și în fișier.",
    "copied": "Copiat",
    "revert": "Renunță la modificări",
    "unsaved": "Nesalvat",
    "copy": "Copiază",
    "saved": "Salvat",
    "people_home": "Acasă: {n}",
    "nobody_home": "Nimeni acasă",
    "ok": "OK",
    "blocked.vacation": "în pauză (vacanță)",
    "blocked.away": "în pauză (nimeni acasă)",
    "blocked.alarm": "în pauză (alarmă armată)",
    "blocked.nap": "în pauză (somn de prânz)"
  },
  "da": {
    "tabs": {
      "activity": "Aktivitet",
      "rules": "Regler",
      "rooms": "Rum",
      "journal": "Logbog",
      "settings": "Indstillinger",
      "yaml": "YAML"
    },
    "subtitle": "{rules} regler · {alerts} · {timers}",
    "alerts_one": "1 alarm",
    "alerts_other": "{n} alarmer",
    "no_alert": "ingen alarm",
    "timers_one": "1 timer",
    "timers_other": "{n} timere",
    "no_timer": "ingen timer",
    "all_good": "Alt er i orden",
    "in_progress": "I gang",
    "timers": "Tidsstyret sluk",
    "watch": "Overvågning",
    "latest": "Seneste",
    "see_journal": "Se logbogen",
    "acknowledge": "Kvittér",
    "snooze15": "Pause 15 min",
    "resume": "Genoptag",
    "extend": "+15 min",
    "turn_off": "Sluk",
    "test": "Test",
    "edit": "Rediger",
    "delete": "Slet",
    "save": "Gem",
    "cancel": "Annuller",
    "close": "Luk",
    "new_rule": "Ny regel",
    "all": "Alle",
    "rule_yaml": "Regel (YAML)",
    "reloaded": "{file} ændret kl. {time} · {n} regler genindlæst",
    "yaml_invalid": "house_rules.yaml er ugyldig ({where}): {error}. Den sidste gyldige konfiguration kører videre; redigering er sat på pause.",
    "conflict_title": "Filen blev ændret under redigeringen",
    "conflict_file": "Fil",
    "conflict_panel": "Panel",
    "keep_file": "Behold filen",
    "keep_panel": "Behold panelet",
    "confirm_delete": "Slet reglen {name}?",
    "room": "Rum",
    "light": "Lys",
    "opening": "Åbning",
    "climate": "Aircondition",
    "presence": "Tilstedeværelse",
    "illuminance": "Lysstyrke",
    "naps": "Lure",
    "add_room": "Tilføj et rum",
    "rooms_help": "Navne på rum, som robotten melder dem. Bruges af robot- og tilstedeværelsesreglerne.",
    "remove": "Fjern",
    "today": "Kørsler i dag",
    "search": "Søg efter en regel eller en enhed",
    "failures": "Fejl",
    "source": "Konfigurationens kilde",
    "source_yaml": "YAML",
    "source_storage": "Lager",
    "modified": "Ændret kl. {time}",
    "reload": "Genindlæs",
    "switch_yaml": "Skift til YAML",
    "switch_yaml_help": "Skriver /config/house_rules.yaml ud fra den aktuelle konfiguration. Derefter er filen kilden og kan redigeres fra begge sider.",
    "yaml_help": "Gemmes der i panelet, omskrives kun reglens blok (efter id), med kommentarer bevaret og en .bak-kopi. Ændringer i filen genindlæses inden for sekunder.",
    "conditions": "Globale betingelser",
    "quiet_hours": "Stille timer",
    "quiet_help": "Lys og lyd slået fra, kun notifikationer (for de regler, der respekterer dem).",
    "notify": "Standardmål for notifikationer",
    "alarm": "Alarmenhed",
    "repairs": "Reparation, når en regel giver op",
    "vacation": "Ferietilstand",
    "import": "Import",
    "import_help": "Regler foreslået ud fra dine etiketter og automatiseringer. Importerede automatiseringer slås fra, slettes aldrig. Også lys ved tilstedeværelse fra Smart Comfort: fjern dem der efter import.",
    "analyze": "Analyser",
    "import_selected": "Importér {n}",
    "nothing_found": "Intet at importere.",
    "yaml_file_help": "Hele {path}, som den er skrevet. Gemning kontrollerer først YAML og hver regel, beholder en .bak-kopi og genstarter kun de ændrede regler.",
    "yaml_includes": "Dele af konfigurationen kommer fra inkluderede filer: de redigeres i disse filer eller under fanerne Regler og Rum.",
    "yaml_storage_help": "Konfigurationen gemmes af integrationen: her er den som YAML, skrivebeskyttet. Skift til YAML for at redigere den her og i filen.",
    "copied": "Kopieret",
    "revert": "Fortryd ændringer",
    "unsaved": "Ikke gemt",
    "copy": "Kopiér",
    "saved": "Gemt",
    "people_home": "{n} hjemme",
    "nobody_home": "Ingen hjemme",
    "ok": "OK",
    "blocked.vacation": "på pause (ferie)",
    "blocked.away": "på pause (ingen hjemme)",
    "blocked.alarm": "på pause (alarm tilkoblet)",
    "blocked.nap": "sat på pause (lur)"
  },
  "sv": {
    "tabs": {
      "activity": "Aktivitet",
      "rules": "Regler",
      "rooms": "Rum",
      "journal": "Logg",
      "settings": "Inställningar",
      "yaml": "YAML"
    },
    "subtitle": "{rules} regler · {alerts} · {timers}",
    "alerts_one": "1 larm",
    "alerts_other": "{n} larm",
    "no_alert": "inget larm",
    "timers_one": "1 timer",
    "timers_other": "{n} timers",
    "no_timer": "ingen timer",
    "all_good": "Allt är bra",
    "in_progress": "Pågår",
    "timers": "Tidsstyrd avstängning",
    "watch": "Bevakning",
    "latest": "Senaste",
    "see_journal": "Visa loggen",
    "acknowledge": "Kvittera",
    "snooze15": "Pausa 15 min",
    "resume": "Återuppta",
    "extend": "+15 min",
    "turn_off": "Stäng av",
    "test": "Testa",
    "edit": "Redigera",
    "delete": "Ta bort",
    "save": "Spara",
    "cancel": "Avbryt",
    "close": "Stäng",
    "new_rule": "Ny regel",
    "all": "Alla",
    "rule_yaml": "Regel (YAML)",
    "reloaded": "{file} ändrad {time} · {n} regler omladdade",
    "yaml_invalid": "house_rules.yaml är ogiltig ({where}): {error}. Den senaste giltiga konfigurationen fortsätter köras; redigering är pausad.",
    "conflict_title": "Filen ändrades medan du redigerade",
    "conflict_file": "Fil",
    "conflict_panel": "Panel",
    "keep_file": "Behåll filen",
    "keep_panel": "Behåll panelen",
    "confirm_delete": "Ta bort regeln {name}?",
    "room": "Rum",
    "light": "Lampa",
    "opening": "Öppning",
    "climate": "Luftkonditionering",
    "presence": "Närvaro",
    "illuminance": "Ljusstyrka",
    "naps": "Tupplurar",
    "add_room": "Lägg till ett rum",
    "rooms_help": "Rummens namn så som roboten rapporterar dem. Används av robot- och närvaroreglerna.",
    "remove": "Ta bort",
    "today": "Körningar i dag",
    "search": "Sök efter en regel eller en entitet",
    "failures": "Fel",
    "source": "Konfigurationens källa",
    "source_yaml": "YAML",
    "source_storage": "Lagring",
    "modified": "Ändrad {time}",
    "reload": "Ladda om",
    "switch_yaml": "Byt till YAML",
    "switch_yaml_help": "Skriver /config/house_rules.yaml från den aktuella konfigurationen. Därefter är filen källan och kan redigeras från båda håll.",
    "yaml_help": "När du sparar i panelen skrivs bara regelns block om (efter id), med kommentarer kvar och en .bak-kopia. Ändringar i filen laddas om inom några sekunder.",
    "conditions": "Globala villkor",
    "quiet_hours": "Tysta timmar",
    "quiet_help": "Ljus och ljud tystade, bara aviseringar (för de regler som respekterar dem).",
    "notify": "Standardmål för aviseringar",
    "alarm": "Larmentitet",
    "repairs": "Reparation när en regel ger upp",
    "vacation": "Semesterläge",
    "import": "Import",
    "import_help": "Regler föreslagna utifrån dina etiketter och automationer. Importerade automationer stängs av, tas aldrig bort. Även lampor vid närvaro från Smart Comfort: ta bort dem där efter importen.",
    "analyze": "Analysera",
    "import_selected": "Importera {n}",
    "nothing_found": "Inget att importera.",
    "yaml_file_help": "Hela {path}, så som den är skriven. Sparning kontrollerar först YAML och varje regel, behåller en .bak-kopia och startar bara om ändrade regler.",
    "yaml_includes": "Delar av konfigurationen kommer från inkluderade filer: de redigeras i de filerna eller under flikarna Regler och Rum.",
    "yaml_storage_help": "Konfigurationen lagras av integrationen: här är den som YAML, skrivskyddad. Byt till YAML för att redigera den här och i filen.",
    "copied": "Kopierat",
    "revert": "Ångra ändringar",
    "unsaved": "Inte sparat",
    "copy": "Kopiera",
    "saved": "Sparat",
    "people_home": "{n} hemma",
    "nobody_home": "Ingen hemma",
    "ok": "OK",
    "blocked.vacation": "pausad (semester)",
    "blocked.away": "pausad (ingen hemma)",
    "blocked.alarm": "pausad (larm aktiverat)",
    "blocked.nap": "pausad (tupplur)"
  },
  "bg": {
    "tabs": {
      "activity": "Активност",
      "rules": "Правила",
      "rooms": "Стаи",
      "journal": "Дневник",
      "settings": "Настройки",
      "yaml": "YAML"
    },
    "subtitle": "Правила: {rules} · {alerts} · {timers}",
    "alerts_one": "1 тревога",
    "alerts_other": "Тревоги: {n}",
    "no_alert": "няма тревоги",
    "timers_one": "1 таймер",
    "timers_other": "Таймери: {n}",
    "no_timer": "няма таймери",
    "all_good": "Всичко е наред",
    "in_progress": "В ход",
    "timers": "Изключване с таймер",
    "watch": "Наблюдение",
    "latest": "Последни",
    "see_journal": "Виж дневника",
    "acknowledge": "Потвърди",
    "snooze15": "Пауза 15 мин",
    "resume": "Възобнови",
    "extend": "+15 min",
    "turn_off": "Изключи",
    "test": "Тествай",
    "edit": "Редактирай",
    "delete": "Изтрий",
    "save": "Запази",
    "cancel": "Отказ",
    "close": "Затвори",
    "new_rule": "Ново правило",
    "all": "Всички",
    "rule_yaml": "Правило (YAML)",
    "reloaded": "{file} променен в {time} · презаредени правила: {n}",
    "yaml_invalid": "house_rules.yaml е невалиден ({where}): {error}. Последната валидна конфигурация продължава да работи; редакциите са спрени.",
    "conflict_title": "Файлът се промени по време на редакция",
    "conflict_file": "Файл",
    "conflict_panel": "Панел",
    "keep_file": "Запази файла",
    "keep_panel": "Запази панела",
    "confirm_delete": "Да се изтрие ли правилото {name}?",
    "room": "Стая",
    "light": "Светлина",
    "opening": "Отвор",
    "climate": "Климатик",
    "presence": "Присъствие",
    "illuminance": "Осветеност",
    "naps": "Следобеден сън",
    "add_room": "Добави стая",
    "rooms_help": "Имената на стаите, както ги съобщава роботът. Използват се от правилата за робота и присъствието.",
    "remove": "Премахни",
    "today": "Изпълнения днес",
    "search": "Търси правило или обект",
    "failures": "Неуспехи",
    "source": "Източник на конфигурацията",
    "source_yaml": "YAML",
    "source_storage": "Хранилище",
    "modified": "Променено в {time}",
    "reload": "Презареди",
    "switch_yaml": "Премини към YAML",
    "switch_yaml_help": "Записва /config/house_rules.yaml от текущата конфигурация. Оттам нататък източник е файлът, редактируем и от двете страни.",
    "yaml_help": "Запазването в панела презаписва само блока на правилото (по id), коментарите остават, с копие .bak. Промените във файла се зареждат до няколко секунди.",
    "conditions": "Общи условия",
    "quiet_hours": "Тихи часове",
    "quiet_help": "Светлини и звуци заглушени, само известия (за правилата, които ги спазват).",
    "notify": "Получател на известия по подразбиране",
    "alarm": "Обект на алармата",
    "repairs": "Сигнал в Поправки, когато правило се откаже",
    "vacation": "Режим отпуск",
    "import": "Импорт",
    "import_help": "Правила, предложени от вашите етикети и автоматизации. Импортираните автоматизации се изключват, никога не се изтриват. Също и светлините при присъствие от Smart Comfort: премахнете ги там след импортиране.",
    "analyze": "Анализирай",
    "import_selected": "Импортирай ({n})",
    "nothing_found": "Няма нищо за импорт.",
    "yaml_file_help": "Целият {path}, както е написан. При запазване първо се проверяват YAML и всяко правило, пази се копие .bak и се рестартират само променените правила.",
    "yaml_includes": "Части от конфигурацията идват от включени файлове: редактират се в тях или в разделите Правила и Стаи.",
    "yaml_storage_help": "Конфигурацията се пази от интеграцията: тук е в YAML, само за четене. Преминете към YAML, за да я редактирате тук и във файла.",
    "copied": "Копирано",
    "revert": "Отхвърли промените",
    "unsaved": "Незапазено",
    "copy": "Копирай",
    "saved": "Запазено",
    "people_home": "У дома: {n}",
    "nobody_home": "Няма никой у дома",
    "ok": "OK",
    "blocked.vacation": "спряно (отпуск)",
    "blocked.away": "спряно (няма никой)",
    "blocked.alarm": "спряно (алармата е активна)",
    "blocked.nap": "спряно (следобеден сън)"
  },
  "ru": {
    "tabs": {
      "activity": "Активность",
      "rules": "Правила",
      "rooms": "Комнаты",
      "journal": "Журнал",
      "settings": "Настройки",
      "yaml": "YAML"
    },
    "subtitle": "Правила: {rules} · {alerts} · {timers}",
    "alerts_one": "1 тревога",
    "alerts_other": "Тревоги: {n}",
    "no_alert": "нет тревог",
    "timers_one": "1 таймер",
    "timers_other": "Таймеры: {n}",
    "no_timer": "нет таймеров",
    "all_good": "Всё в порядке",
    "in_progress": "Выполняется",
    "timers": "Выключение по таймеру",
    "watch": "Наблюдение",
    "latest": "Последние",
    "see_journal": "Открыть журнал",
    "acknowledge": "Подтвердить",
    "snooze15": "Пауза 15 мин",
    "resume": "Возобновить",
    "extend": "+15 min",
    "turn_off": "Выключить",
    "test": "Проверить",
    "edit": "Изменить",
    "delete": "Удалить",
    "save": "Сохранить",
    "cancel": "Отмена",
    "close": "Закрыть",
    "new_rule": "Новое правило",
    "all": "Все",
    "rule_yaml": "Правило (YAML)",
    "reloaded": "{file} изменён в {time} · перезагружено правил: {n}",
    "yaml_invalid": "house_rules.yaml недействителен ({where}): {error}. Последняя рабочая конфигурация продолжает работать; изменения приостановлены.",
    "conflict_title": "Файл изменился во время редактирования",
    "conflict_file": "Файл",
    "conflict_panel": "Панель",
    "keep_file": "Оставить файл",
    "keep_panel": "Оставить панель",
    "confirm_delete": "Удалить правило {name}?",
    "room": "Комната",
    "light": "Свет",
    "opening": "Проём",
    "climate": "Кондиционер",
    "presence": "Присутствие",
    "illuminance": "Освещённость",
    "naps": "Дневной сон",
    "add_room": "Добавить комнату",
    "rooms_help": "Названия комнат так, как их сообщает робот. Используются правилами робота и присутствия.",
    "remove": "Убрать",
    "today": "Запуски сегодня",
    "search": "Найти правило или объект",
    "failures": "Сбои",
    "source": "Источник конфигурации",
    "source_yaml": "YAML",
    "source_storage": "Хранилище",
    "modified": "Изменено в {time}",
    "reload": "Перезагрузить",
    "switch_yaml": "Перейти на YAML",
    "switch_yaml_help": "Записывает /config/house_rules.yaml из текущей конфигурации. Далее источником становится файл, редактируемый с обеих сторон.",
    "yaml_help": "Сохранение в панели перезаписывает только блок правила (по id), комментарии сохраняются, с копией .bak. Изменения в файле подхватываются за несколько секунд.",
    "conditions": "Общие условия",
    "quiet_hours": "Тихие часы",
    "quiet_help": "Свет и звук отключены, только уведомления (для правил, которые их соблюдают).",
    "notify": "Получатель уведомлений по умолчанию",
    "alarm": "Объект сигнализации",
    "repairs": "Сообщать в Исправлениях, когда правило сдаётся",
    "vacation": "Режим отпуска",
    "import": "Импорт",
    "import_help": "Правила, предложенные на основе ваших меток и автоматизаций. Импортированные автоматизации отключаются, но не удаляются. А также свет по присутствию из Smart Comfort: удалите его там после импорта.",
    "analyze": "Анализировать",
    "import_selected": "Импортировать ({n})",
    "nothing_found": "Нечего импортировать.",
    "yaml_file_help": "Весь {path} в том виде, как он написан. При сохранении сначала проверяются YAML и каждое правило, сохраняется копия .bak и перезапускаются только изменённые правила.",
    "yaml_includes": "Часть конфигурации взята из подключённых файлов: редактируйте её в этих файлах или на вкладках Правила и Комнаты.",
    "yaml_storage_help": "Конфигурацию хранит интеграция: здесь она показана в YAML только для чтения. Перейдите на YAML, чтобы редактировать её здесь и в файле.",
    "copied": "Скопировано",
    "revert": "Отменить изменения",
    "unsaved": "Не сохранено",
    "copy": "Копировать",
    "saved": "Сохранено",
    "people_home": "Дома: {n}",
    "nobody_home": "Никого нет дома",
    "ok": "OK",
    "blocked.vacation": "приостановлено (отпуск)",
    "blocked.away": "приостановлено (никого нет дома)",
    "blocked.alarm": "приостановлено (сигнализация включена)",
    "blocked.nap": "приостановлено (дневной сон)"
  },
  "uk": {
    "tabs": {
      "activity": "Активність",
      "rules": "Правила",
      "rooms": "Кімнати",
      "journal": "Журнал",
      "settings": "Налаштування",
      "yaml": "YAML"
    },
    "subtitle": "Правила: {rules} · {alerts} · {timers}",
    "alerts_one": "1 тривога",
    "alerts_other": "Тривоги: {n}",
    "no_alert": "немає тривог",
    "timers_one": "1 таймер",
    "timers_other": "Таймери: {n}",
    "no_timer": "немає таймерів",
    "all_good": "Усе гаразд",
    "in_progress": "Виконується",
    "timers": "Вимкнення за таймером",
    "watch": "Нагляд",
    "latest": "Останні",
    "see_journal": "Відкрити журнал",
    "acknowledge": "Підтвердити",
    "snooze15": "Пауза 15 хв",
    "resume": "Відновити",
    "extend": "+15 min",
    "turn_off": "Вимкнути",
    "test": "Перевірити",
    "edit": "Змінити",
    "delete": "Видалити",
    "save": "Зберегти",
    "cancel": "Скасувати",
    "close": "Закрити",
    "new_rule": "Нове правило",
    "all": "Усі",
    "rule_yaml": "Правило (YAML)",
    "reloaded": "{file} змінено о {time} · перезавантажено правил: {n}",
    "yaml_invalid": "house_rules.yaml недійсний ({where}): {error}. Остання робоча конфігурація продовжує працювати; зміни призупинено.",
    "conflict_title": "Файл змінився під час редагування",
    "conflict_file": "Файл",
    "conflict_panel": "Панель",
    "keep_file": "Залишити файл",
    "keep_panel": "Залишити панель",
    "confirm_delete": "Видалити правило {name}?",
    "room": "Кімната",
    "light": "Світло",
    "opening": "Отвір",
    "climate": "Кондиціонер",
    "presence": "Присутність",
    "illuminance": "Освітленість",
    "naps": "Денний сон",
    "add_room": "Додати кімнату",
    "rooms_help": "Назви кімнат так, як їх повідомляє робот. Використовуються правилами робота й присутності.",
    "remove": "Прибрати",
    "today": "Запуски сьогодні",
    "search": "Знайти правило або об'єкт",
    "failures": "Збої",
    "source": "Джерело конфігурації",
    "source_yaml": "YAML",
    "source_storage": "Сховище",
    "modified": "Змінено о {time}",
    "reload": "Перезавантажити",
    "switch_yaml": "Перейти на YAML",
    "switch_yaml_help": "Записує /config/house_rules.yaml з поточної конфігурації. Відтак джерелом стає файл, який можна редагувати з обох боків.",
    "yaml_help": "Збереження в панелі перезаписує лише блок правила (за id), коментарі зберігаються, з копією .bak. Зміни у файлі підхоплюються за кілька секунд.",
    "conditions": "Загальні умови",
    "quiet_hours": "Тихі години",
    "quiet_help": "Світло й звук вимкнено, лише сповіщення (для правил, які їх дотримуються).",
    "notify": "Отримувач сповіщень за замовчуванням",
    "alarm": "Об'єкт сигналізації",
    "repairs": "Повідомляти у Виправленнях, коли правило здається",
    "vacation": "Режим відпустки",
    "import": "Імпорт",
    "import_help": "Правила, запропоновані на основі ваших міток і автоматизацій. Імпортовані автоматизації вимикаються, але не видаляються. А також світло за присутністю зі Smart Comfort: видаліть його там після імпорту.",
    "analyze": "Аналізувати",
    "import_selected": "Імпортувати ({n})",
    "nothing_found": "Немає чого імпортувати.",
    "yaml_file_help": "Увесь {path} у тому вигляді, як він написаний. Під час збереження спершу перевіряються YAML і кожне правило, зберігається копія .bak і перезапускаються лише змінені правила.",
    "yaml_includes": "Частина конфігурації походить із підключених файлів: редагуйте її в цих файлах або на вкладках Правила та Кімнати.",
    "yaml_storage_help": "Конфігурацію зберігає інтеграція: тут вона показана в YAML лише для читання. Перейдіть на YAML, щоб редагувати її тут і у файлі.",
    "copied": "Скопійовано",
    "revert": "Скасувати зміни",
    "unsaved": "Не збережено",
    "copy": "Копіювати",
    "saved": "Збережено",
    "people_home": "Удома: {n}",
    "nobody_home": "Нікого немає вдома",
    "ok": "OK",
    "blocked.vacation": "призупинено (відпустка)",
    "blocked.away": "призупинено (нікого вдома)",
    "blocked.alarm": "призупинено (сигналізацію ввімкнено)",
    "blocked.nap": "призупинено (денний сон)"
  },
  "hu": {
    "tabs": {
      "activity": "Tevékenység",
      "rules": "Szabályok",
      "rooms": "Helyiségek",
      "journal": "Napló",
      "settings": "Beállítások",
      "yaml": "YAML"
    },
    "subtitle": "{rules} szabály · {alerts} · {timers}",
    "alerts_one": "1 riasztás",
    "alerts_other": "{n} riasztás",
    "no_alert": "nincs riasztás",
    "timers_one": "1 időzítő",
    "timers_other": "{n} időzítő",
    "no_timer": "nincs időzítő",
    "all_good": "Minden rendben",
    "in_progress": "Folyamatban",
    "timers": "Időzített kikapcsolás",
    "watch": "Felügyelet",
    "latest": "Legutóbbiak",
    "see_journal": "Napló megtekintése",
    "acknowledge": "Nyugtázás",
    "snooze15": "Szünet 15 percre",
    "resume": "Folytatás",
    "extend": "+15 min",
    "turn_off": "Kikapcsolás",
    "test": "Teszt",
    "edit": "Szerkesztés",
    "delete": "Törlés",
    "save": "Mentés",
    "cancel": "Mégse",
    "close": "Bezárás",
    "new_rule": "Új szabály",
    "all": "Mind",
    "rule_yaml": "Szabály (YAML)",
    "reloaded": "{file} módosult ekkor: {time} · {n} szabály újratöltve",
    "yaml_invalid": "A house_rules.yaml érvénytelen ({where}): {error}. Az utolsó érvényes konfiguráció tovább fut; a szerkesztés szünetel.",
    "conflict_title": "A fájl megváltozott szerkesztés közben",
    "conflict_file": "Fájl",
    "conflict_panel": "Panel",
    "keep_file": "A fájl megtartása",
    "keep_panel": "A panel megtartása",
    "confirm_delete": "Törlöd a(z) {name} szabályt?",
    "room": "Helyiség",
    "light": "Lámpa",
    "opening": "Nyílászáró",
    "climate": "Légkondi",
    "presence": "Jelenlét",
    "illuminance": "Megvilágítás",
    "naps": "Délutáni alvás",
    "add_room": "Helyiség hozzáadása",
    "rooms_help": "A helyiségek neve, ahogy a robot jelenti őket. A robot- és jelenlétszabályok használják.",
    "remove": "Eltávolítás",
    "today": "Mai futások",
    "search": "Szabály vagy entitás keresése",
    "failures": "Hibák",
    "source": "A konfiguráció forrása",
    "source_yaml": "YAML",
    "source_storage": "Tárhely",
    "modified": "Módosítva: {time}",
    "reload": "Újratöltés",
    "switch_yaml": "Váltás YAML-ra",
    "switch_yaml_help": "Megírja a /config/house_rules.yaml fájlt a jelenlegi konfigurációból. Ezután a fájl a forrás, mindkét oldalról szerkeszthető.",
    "yaml_help": "A panelen mentéskor csak a szabály blokkja íródik újra (azonosító szerint), a megjegyzések megmaradnak, .bak másolattal. A fájlban tett módosítások másodperceken belül újratöltődnek.",
    "conditions": "Globális feltételek",
    "quiet_hours": "Csendes órák",
    "quiet_help": "Fények és hangok némítva, csak értesítések (a feltételt figyelembe vevő szabályoknál).",
    "notify": "Alapértelmezett értesítési cél",
    "alarm": "Riasztó entitás",
    "repairs": "Javítási jelzés, ha egy szabály feladja",
    "vacation": "Szabadság mód",
    "import": "Importálás",
    "import_help": "Szabályjavaslatok a címkéid és automatizálásaid alapján. Az importált automatizálások kikapcsolódnak, sosem törlődnek. A Smart Comfort jelenlétre kapcsolt lámpái is: importálás után töröld őket ott.",
    "analyze": "Elemzés",
    "import_selected": "{n} importálása",
    "nothing_found": "Nincs mit importálni.",
    "yaml_file_help": "A teljes {path}, ahogy meg van írva. Mentéskor előbb ellenőrzi a YAML-t és minden szabályt, .bak másolatot tart, és csak a módosult szabályokat indítja újra.",
    "yaml_includes": "A konfiguráció egyes részei beillesztett fájlokból jönnek: ezeket a saját fájljukban vagy a Szabályok és Helyiségek lapon lehet szerkeszteni.",
    "yaml_storage_help": "A konfigurációt az integráció tárolja: itt látható YAML-ként, csak olvasásra. Válts YAML-ra, hogy itt és a fájlban is szerkeszthesd.",
    "copied": "Másolva",
    "revert": "Módosítások elvetése",
    "unsaved": "Nincs mentve",
    "copy": "Másolás",
    "saved": "Mentve",
    "people_home": "{n} otthon",
    "nobody_home": "Senki sincs otthon",
    "ok": "OK",
    "blocked.vacation": "szünetel (szabadság)",
    "blocked.away": "szünetel (senki sincs otthon)",
    "blocked.alarm": "szünetel (riasztó élesítve)",
    "blocked.nap": "szüneteltetve (délutáni alvás)"
  },
  "sk": {
    "tabs": {
      "activity": "Aktivita",
      "rules": "Pravidlá",
      "rooms": "Miestnosti",
      "journal": "Denník",
      "settings": "Nastavenia",
      "yaml": "YAML"
    },
    "subtitle": "Pravidlá: {rules} · {alerts} · {timers}",
    "alerts_one": "1 poplach",
    "alerts_other": "Poplachy: {n}",
    "no_alert": "žiadny poplach",
    "timers_one": "1 časovač",
    "timers_other": "Časovače: {n}",
    "no_timer": "žiadny časovač",
    "all_good": "Všetko v poriadku",
    "in_progress": "Prebieha",
    "timers": "Časované vypnutie",
    "watch": "Dohľad",
    "latest": "Posledné",
    "see_journal": "Zobraziť denník",
    "acknowledge": "Potvrdiť",
    "snooze15": "Pozastaviť na 15 min",
    "resume": "Obnoviť",
    "extend": "+15 min",
    "turn_off": "Vypnúť",
    "test": "Otestovať",
    "edit": "Upraviť",
    "delete": "Odstrániť",
    "save": "Uložiť",
    "cancel": "Zrušiť",
    "close": "Zavrieť",
    "new_rule": "Nové pravidlo",
    "all": "Všetko",
    "rule_yaml": "Pravidlo (YAML)",
    "reloaded": "{file} zmenený o {time} · znovu načítané pravidlá: {n}",
    "yaml_invalid": "house_rules.yaml je neplatný ({where}): {error}. Posledná platná konfigurácia beží ďalej; úpravy sú pozastavené.",
    "conflict_title": "Súbor sa počas úprav zmenil",
    "conflict_file": "Súbor",
    "conflict_panel": "Panel",
    "keep_file": "Ponechať súbor",
    "keep_panel": "Ponechať panel",
    "confirm_delete": "Odstrániť pravidlo {name}?",
    "room": "Miestnosť",
    "light": "Svetlo",
    "opening": "Otvor",
    "climate": "Klimatizácia",
    "presence": "Prítomnosť",
    "illuminance": "Osvetlenie",
    "naps": "Spánok cez deň",
    "add_room": "Pridať miestnosť",
    "rooms_help": "Názvy miestností tak, ako ich hlási robot. Používajú ich pravidlá robota a prítomnosti.",
    "remove": "Odobrať",
    "today": "Dnešné spustenia",
    "search": "Hľadať pravidlo alebo entitu",
    "failures": "Chyby",
    "source": "Zdroj konfigurácie",
    "source_yaml": "YAML",
    "source_storage": "Úložisko",
    "modified": "Zmenené o {time}",
    "reload": "Znovu načítať",
    "switch_yaml": "Prejsť na YAML",
    "switch_yaml_help": "Zapíše /config/house_rules.yaml z aktuálnej konfigurácie. Odvtedy je zdrojom súbor, upraviteľný z oboch strán.",
    "yaml_help": "Uloženie v paneli prepíše len blok pravidla (podľa id), komentáre zostanú, s kópiou .bak. Zmeny v súbore sa načítajú do niekoľkých sekúnd.",
    "conditions": "Globálne podmienky",
    "quiet_hours": "Tiché hodiny",
    "quiet_help": "Svetlá a zvuky stlmené, len oznámenia (pri pravidlách, ktoré ich rešpektujú).",
    "notify": "Predvolený cieľ oznámení",
    "alarm": "Entita alarmu",
    "repairs": "Hlásenie v Opravách, keď to pravidlo vzdá",
    "vacation": "Režim dovolenky",
    "import": "Import",
    "import_help": "Pravidlá navrhnuté z vašich štítkov a automatizácií. Importované automatizácie sa vypnú, nikdy neodstránia. Aj svetlá pri prítomnosti zo Smart Comfort: po importe ich tam odstráňte.",
    "analyze": "Analyzovať",
    "import_selected": "Importovať ({n})",
    "nothing_found": "Nie je čo importovať.",
    "yaml_file_help": "Celý súbor {path}, tak ako je napísaný. Uloženie najprv skontroluje YAML a každé pravidlo, ponechá kópiu .bak a reštartuje len zmenené pravidlá.",
    "yaml_includes": "Časti konfigurácie pochádzajú z vložených súborov: upravujú sa v týchto súboroch alebo na kartách Pravidlá a Miestnosti.",
    "yaml_storage_help": "Konfiguráciu ukladá integrácia: tu je v YAML, len na čítanie. Prejdite na YAML, aby ste ju mohli upravovať tu aj v súbore.",
    "copied": "Skopírované",
    "revert": "Zahodiť zmeny",
    "unsaved": "Neuložené",
    "copy": "Kopírovať",
    "saved": "Uložené",
    "people_home": "Doma: {n}",
    "nobody_home": "Nikto doma",
    "ok": "OK",
    "blocked.vacation": "pozastavené (dovolenka)",
    "blocked.away": "pozastavené (nikto doma)",
    "blocked.alarm": "pozastavené (alarm aktívny)",
    "blocked.nap": "pozastavené (spánok cez deň)"
  },
  "cs": {
    "tabs": {
      "activity": "Aktivita",
      "rules": "Pravidla",
      "rooms": "Místnosti",
      "journal": "Deník",
      "settings": "Nastavení",
      "yaml": "YAML"
    },
    "subtitle": "Pravidla: {rules} · {alerts} · {timers}",
    "alerts_one": "1 poplach",
    "alerts_other": "Poplachy: {n}",
    "no_alert": "žádný poplach",
    "timers_one": "1 časovač",
    "timers_other": "Časovače: {n}",
    "no_timer": "žádný časovač",
    "all_good": "Vše v pořádku",
    "in_progress": "Probíhá",
    "timers": "Časované vypnutí",
    "watch": "Dohled",
    "latest": "Poslední",
    "see_journal": "Zobrazit deník",
    "acknowledge": "Potvrdit",
    "snooze15": "Pozastavit na 15 min",
    "resume": "Obnovit",
    "extend": "+15 min",
    "turn_off": "Vypnout",
    "test": "Otestovat",
    "edit": "Upravit",
    "delete": "Smazat",
    "save": "Uložit",
    "cancel": "Zrušit",
    "close": "Zavřít",
    "new_rule": "Nové pravidlo",
    "all": "Vše",
    "rule_yaml": "Pravidlo (YAML)",
    "reloaded": "{file} změněn v {time} · znovu načtená pravidla: {n}",
    "yaml_invalid": "house_rules.yaml je neplatný ({where}): {error}. Poslední platná konfigurace dál běží; úpravy jsou pozastaveny.",
    "conflict_title": "Soubor se během úprav změnil",
    "conflict_file": "Soubor",
    "conflict_panel": "Panel",
    "keep_file": "Ponechat soubor",
    "keep_panel": "Ponechat panel",
    "confirm_delete": "Smazat pravidlo {name}?",
    "room": "Místnost",
    "light": "Světlo",
    "opening": "Otvor",
    "climate": "Klimatizace",
    "presence": "Přítomnost",
    "illuminance": "Osvětlení",
    "naps": "Spánek přes den",
    "add_room": "Přidat místnost",
    "rooms_help": "Názvy místností tak, jak je hlásí robot. Používají je pravidla robota a přítomnosti.",
    "remove": "Odebrat",
    "today": "Dnešní spuštění",
    "search": "Hledat pravidlo nebo entitu",
    "failures": "Chyby",
    "source": "Zdroj konfigurace",
    "source_yaml": "YAML",
    "source_storage": "Úložiště",
    "modified": "Změněno v {time}",
    "reload": "Znovu načíst",
    "switch_yaml": "Přejít na YAML",
    "switch_yaml_help": "Zapíše /config/house_rules.yaml z aktuální konfigurace. Od té chvíle je zdrojem soubor, upravitelný z obou stran.",
    "yaml_help": "Uložení v panelu přepíše jen blok pravidla (podle id), komentáře zůstanou, s kopií .bak. Změny v souboru se načtou během několika sekund.",
    "conditions": "Globální podmínky",
    "quiet_hours": "Tiché hodiny",
    "quiet_help": "Světla a zvuky ztlumeny, jen oznámení (u pravidel, která je respektují).",
    "notify": "Výchozí cíl oznámení",
    "alarm": "Entita alarmu",
    "repairs": "Hlášení v Opravách, když pravidlo to vzdá",
    "vacation": "Režim dovolené",
    "import": "Import",
    "import_help": "Pravidla navržená z vašich štítků a automatizací. Importované automatizace se vypnou, nikdy nesmažou. I světla při přítomnosti ze Smart Comfort: po importu je tam odstraňte.",
    "analyze": "Analyzovat",
    "import_selected": "Importovat ({n})",
    "nothing_found": "Není co importovat.",
    "yaml_file_help": "Celý soubor {path}, tak jak je napsán. Uložení nejdřív zkontroluje YAML a každé pravidlo, ponechá kopii .bak a restartuje jen změněná pravidla.",
    "yaml_includes": "Části konfigurace pocházejí z vložených souborů: upravují se v těchto souborech nebo na kartách Pravidla a Místnosti.",
    "yaml_storage_help": "Konfiguraci ukládá integrace: zde je v YAML, jen pro čtení. Přejděte na YAML, abyste ji mohli upravovat zde i v souboru.",
    "copied": "Zkopírováno",
    "revert": "Zahodit změny",
    "unsaved": "Neuloženo",
    "copy": "Kopírovat",
    "saved": "Uloženo",
    "people_home": "Doma: {n}",
    "nobody_home": "Nikdo doma",
    "ok": "OK",
    "blocked.vacation": "pozastaveno (dovolená)",
    "blocked.away": "pozastaveno (nikdo doma)",
    "blocked.alarm": "pozastaveno (alarm aktivní)",
    "blocked.nap": "pozastaveno (spánek přes den)"
  },
  "sl": {
    "tabs": {
      "activity": "Dejavnost",
      "rules": "Pravila",
      "rooms": "Prostori",
      "journal": "Dnevnik",
      "settings": "Nastavitve",
      "yaml": "YAML"
    },
    "subtitle": "Pravila: {rules} · {alerts} · {timers}",
    "alerts_one": "1 alarm",
    "alerts_other": "Alarmi: {n}",
    "no_alert": "brez alarma",
    "timers_one": "1 časovnik",
    "timers_other": "Časovniki: {n}",
    "no_timer": "brez časovnika",
    "all_good": "Vse v redu",
    "in_progress": "Poteka",
    "timers": "Časovni izklopi",
    "watch": "Nadzor",
    "latest": "Zadnje",
    "see_journal": "Ogled dnevnika",
    "acknowledge": "Potrdi",
    "snooze15": "Premor 15 min",
    "resume": "Nadaljuj",
    "extend": "+15 min",
    "turn_off": "Izklopi",
    "test": "Preizkusi",
    "edit": "Uredi",
    "delete": "Izbriši",
    "save": "Shrani",
    "cancel": "Prekliči",
    "close": "Zapri",
    "new_rule": "Novo pravilo",
    "all": "Vse",
    "rule_yaml": "Pravilo (YAML)",
    "reloaded": "{file} spremenjen ob {time} · ponovno naložena pravila: {n}",
    "yaml_invalid": "house_rules.yaml ni veljaven ({where}): {error}. Zadnja veljavna konfiguracija še naprej deluje; urejanje je začasno ustavljeno.",
    "conflict_title": "Datoteka se je med urejanjem spremenila",
    "conflict_file": "Datoteka",
    "conflict_panel": "Plošča",
    "keep_file": "Obdrži datoteko",
    "keep_panel": "Obdrži ploščo",
    "confirm_delete": "Izbrišem pravilo {name}?",
    "room": "Prostor",
    "light": "Luč",
    "opening": "Odprtina",
    "climate": "Klimatska naprava",
    "presence": "Prisotnost",
    "illuminance": "Osvetljenost",
    "naps": "Dremež",
    "add_room": "Dodaj prostor",
    "rooms_help": "Imena prostorov, kot jih sporoča robot. Uporabljajo jih pravila robota in prisotnosti.",
    "remove": "Odstrani",
    "today": "Današnji zagoni",
    "search": "Išči pravilo ali entiteto",
    "failures": "Napake",
    "source": "Vir konfiguracije",
    "source_yaml": "YAML",
    "source_storage": "Shramba",
    "modified": "Spremenjeno ob {time}",
    "reload": "Ponovno naloži",
    "switch_yaml": "Preklopi na YAML",
    "switch_yaml_help": "Zapiše /config/house_rules.yaml iz trenutne konfiguracije. Od takrat je vir datoteka, ki jo je mogoče urejati z obeh strani.",
    "yaml_help": "Shranjevanje v plošči prepiše le blok pravila (po id), komentarji ostanejo, s kopijo .bak. Spremembe v datoteki se naložijo v nekaj sekundah.",
    "conditions": "Splošni pogoji",
    "quiet_hours": "Tihe ure",
    "quiet_help": "Luči in zvoki utišani, samo obvestila (za pravila, ki jih upoštevajo).",
    "notify": "Privzeti cilj obvestil",
    "alarm": "Entiteta alarma",
    "repairs": "Prijava v Popravilih, ko pravilo obupa",
    "vacation": "Način dopusta",
    "import": "Uvoz",
    "import_help": "Pravila, predlagana iz vaših oznak in avtomatizacij. Uvožene avtomatizacije se izklopijo, nikoli izbrišejo. Tudi luči ob prisotnosti iz Smart Comfort: po uvozu jih tam odstranite.",
    "analyze": "Analiziraj",
    "import_selected": "Uvozi ({n})",
    "nothing_found": "Ni česa uvoziti.",
    "yaml_file_help": "Celotna datoteka {path}, kot je zapisana. Shranjevanje najprej preveri YAML in vsako pravilo, ohrani kopijo .bak in ponovno zažene le spremenjena pravila.",
    "yaml_includes": "Deli konfiguracije prihajajo iz vključenih datotek: urejajo se v teh datotekah ali na zavihkih Pravila in Prostori.",
    "yaml_storage_help": "Konfiguracijo shranjuje integracija: tukaj je v YAML, samo za branje. Preklopite na YAML, da jo urejate tukaj in v datoteki.",
    "copied": "Kopirano",
    "revert": "Zavrzi spremembe",
    "unsaved": "Ni shranjeno",
    "copy": "Kopiraj",
    "saved": "Shranjeno",
    "people_home": "Doma: {n}",
    "nobody_home": "Nikogar ni doma",
    "ok": "OK",
    "blocked.vacation": "ustavljeno (dopust)",
    "blocked.away": "ustavljeno (nikogar ni doma)",
    "blocked.alarm": "ustavljeno (alarm vklopljen)",
    "blocked.nap": "ustavljeno (dremež)"
  },
  "lv": {
    "tabs": {
      "activity": "Aktivitāte",
      "rules": "Noteikumi",
      "rooms": "Telpas",
      "journal": "Žurnāls",
      "settings": "Iestatījumi",
      "yaml": "YAML"
    },
    "subtitle": "Noteikumi: {rules} · {alerts} · {timers}",
    "alerts_one": "1 trauksme",
    "alerts_other": "Trauksmes: {n}",
    "no_alert": "nav trauksmju",
    "timers_one": "1 taimeris",
    "timers_other": "Taimeri: {n}",
    "no_timer": "nav taimeru",
    "all_good": "Viss kārtībā",
    "in_progress": "Notiek",
    "timers": "Izslēgšana ar taimeri",
    "watch": "Uzraudzība",
    "latest": "Pēdējie",
    "see_journal": "Skatīt žurnālu",
    "acknowledge": "Apstiprināt",
    "snooze15": "Apturēt uz 15 min",
    "resume": "Atsākt",
    "extend": "+15 min",
    "turn_off": "Izslēgt",
    "test": "Pārbaudīt",
    "edit": "Rediģēt",
    "delete": "Dzēst",
    "save": "Saglabāt",
    "cancel": "Atcelt",
    "close": "Aizvērt",
    "new_rule": "Jauns noteikums",
    "all": "Visi",
    "rule_yaml": "Noteikums (YAML)",
    "reloaded": "{file} mainīts {time} · pārlādēti noteikumi: {n}",
    "yaml_invalid": "house_rules.yaml nav derīgs ({where}): {error}. Pēdējā derīgā konfigurācija turpina darboties; rediģēšana ir apturēta.",
    "conflict_title": "Rediģēšanas laikā fails mainījās",
    "conflict_file": "Fails",
    "conflict_panel": "Panelis",
    "keep_file": "Paturēt failu",
    "keep_panel": "Paturēt paneli",
    "confirm_delete": "Dzēst noteikumu {name}?",
    "room": "Telpa",
    "light": "Gaisma",
    "opening": "Atvere",
    "climate": "Gaisa kondicionieris",
    "presence": "Klātbūtne",
    "illuminance": "Apgaismojums",
    "naps": "Diendusa",
    "add_room": "Pievienot telpu",
    "rooms_help": "Telpu nosaukumi, kā tos ziņo robots. Tos izmanto robota un klātbūtnes noteikumi.",
    "remove": "Noņemt",
    "today": "Šodienas izpildes",
    "search": "Meklēt noteikumu vai entītiju",
    "failures": "Kļūdas",
    "source": "Konfigurācijas avots",
    "source_yaml": "YAML",
    "source_storage": "Krātuve",
    "modified": "Mainīts {time}",
    "reload": "Pārlādēt",
    "switch_yaml": "Pāriet uz YAML",
    "switch_yaml_help": "Ieraksta /config/house_rules.yaml no pašreizējās konfigurācijas. Pēc tam avots ir fails, rediģējams no abām pusēm.",
    "yaml_help": "Saglabājot panelī, tiek pārrakstīts tikai noteikuma bloks (pēc id), komentāri saglabājas, ar .bak kopiju. Failā veiktās izmaiņas tiek pārlādētas dažu sekunžu laikā.",
    "conditions": "Vispārīgie nosacījumi",
    "quiet_hours": "Klusās stundas",
    "quiet_help": "Gaismas un skaņas izslēgtas, tikai paziņojumi (noteikumiem, kas tās ievēro).",
    "notify": "Noklusējuma paziņojumu mērķis",
    "alarm": "Signalizācijas entītija",
    "repairs": "Ziņojums Labojumos, kad noteikums padodas",
    "vacation": "Atvaļinājuma režīms",
    "import": "Importēšana",
    "import_help": "Noteikumi, kas ieteikti no jūsu birkām un automatizācijām. Importētās automatizācijas tiek izslēgtas, nekad dzēstas. Arī Smart Comfort klātbūtnes gaismas: pēc importēšanas noņemiet tās tur.",
    "analyze": "Analizēt",
    "import_selected": "Importēt ({n})",
    "nothing_found": "Nav ko importēt.",
    "yaml_file_help": "Viss {path}, kā tas ir uzrakstīts. Saglabājot vispirms tiek pārbaudīts YAML un katrs noteikums, saglabāta .bak kopija un restartēti tikai mainītie noteikumi.",
    "yaml_includes": "Daļa konfigurācijas nāk no iekļautiem failiem: tos rediģē šajos failos vai cilnēs Noteikumi un Telpas.",
    "yaml_storage_help": "Konfigurāciju glabā integrācija: šeit tā ir YAML formātā, tikai lasīšanai. Pārejiet uz YAML, lai to rediģētu šeit un failā.",
    "copied": "Nokopēts",
    "revert": "Atmest izmaiņas",
    "unsaved": "Nav saglabāts",
    "copy": "Kopēt",
    "saved": "Saglabāts",
    "people_home": "Mājās: {n}",
    "nobody_home": "Neviena nav mājās",
    "ok": "OK",
    "blocked.vacation": "apturēts (atvaļinājums)",
    "blocked.away": "apturēts (neviena nav mājās)",
    "blocked.alarm": "apturēts (signalizācija aktivizēta)",
    "blocked.nap": "apturēts (diendusa)"
  },
  "el": {
    "tabs": {
      "activity": "Δραστηριότητα",
      "rules": "Κανόνες",
      "rooms": "Δωμάτια",
      "journal": "Ημερολόγιο",
      "settings": "Ρυθμίσεις",
      "yaml": "YAML"
    },
    "subtitle": "{rules} κανόνες · {alerts} · {timers}",
    "alerts_one": "1 συναγερμός",
    "alerts_other": "{n} συναγερμοί",
    "no_alert": "κανένας συναγερμός",
    "timers_one": "1 χρονόμετρο",
    "timers_other": "{n} χρονόμετρα",
    "no_timer": "κανένα χρονόμετρο",
    "all_good": "Όλα εντάξει",
    "in_progress": "Σε εξέλιξη",
    "timers": "Σβησίματα με χρονόμετρο",
    "watch": "Επιτήρηση",
    "latest": "Πρόσφατα",
    "see_journal": "Προβολή ημερολογίου",
    "acknowledge": "Επιβεβαίωση",
    "snooze15": "Παύση 15 λεπτά",
    "resume": "Συνέχεια",
    "extend": "+15 min",
    "turn_off": "Σβήσιμο",
    "test": "Δοκιμή",
    "edit": "Επεξεργασία",
    "delete": "Διαγραφή",
    "save": "Αποθήκευση",
    "cancel": "Ακύρωση",
    "close": "Κλείσιμο",
    "new_rule": "Νέος κανόνας",
    "all": "Όλα",
    "rule_yaml": "Κανόνας (YAML)",
    "reloaded": "Το {file} άλλαξε στις {time} · επαναφορτώθηκαν {n} κανόνες",
    "yaml_invalid": "Το house_rules.yaml δεν είναι έγκυρο ({where}): {error}. Η τελευταία έγκυρη ρύθμιση συνεχίζει να λειτουργεί· οι αλλαγές έχουν ανασταλεί.",
    "conflict_title": "Το αρχείο άλλαξε κατά την επεξεργασία",
    "conflict_file": "Αρχείο",
    "conflict_panel": "Πίνακας",
    "keep_file": "Διατήρηση αρχείου",
    "keep_panel": "Διατήρηση πίνακα",
    "confirm_delete": "Διαγραφή του κανόνα {name};",
    "room": "Δωμάτιο",
    "light": "Φως",
    "opening": "Άνοιγμα",
    "climate": "Κλιματιστικό",
    "presence": "Παρουσία",
    "illuminance": "Φωτεινότητα",
    "naps": "Μεσημεριανός ύπνος",
    "add_room": "Προσθήκη δωματίου",
    "rooms_help": "Ονόματα δωματίων όπως τα αναφέρει το ρομπότ. Χρησιμοποιούνται από τους κανόνες ρομπότ και παρουσίας.",
    "remove": "Αφαίρεση",
    "today": "Εκτελέσεις σήμερα",
    "search": "Αναζήτηση κανόνα ή οντότητας",
    "failures": "Αποτυχίες",
    "source": "Πηγή ρυθμίσεων",
    "source_yaml": "YAML",
    "source_storage": "Αποθήκευση",
    "modified": "Τροποποιήθηκε στις {time}",
    "reload": "Επαναφόρτωση",
    "switch_yaml": "Μετάβαση σε YAML",
    "switch_yaml_help": "Γράφει το /config/house_rules.yaml από τις τρέχουσες ρυθμίσεις. Από εκεί και πέρα πηγή είναι το αρχείο, επεξεργάσιμο και από τις δύο πλευρές.",
    "yaml_help": "Η αποθήκευση στον πίνακα ξαναγράφει μόνο το μπλοκ του κανόνα (κατά id), τα σχόλια μένουν, με αντίγραφο .bak. Οι αλλαγές στο αρχείο φορτώνονται σε λίγα δευτερόλεπτα.",
    "conditions": "Γενικές συνθήκες",
    "quiet_hours": "Ώρες ησυχίας",
    "quiet_help": "Φώτα και ήχοι σε σίγαση, μόνο ειδοποιήσεις (για κανόνες που τις τηρούν).",
    "notify": "Προεπιλεγμένος παραλήπτης ειδοποιήσεων",
    "alarm": "Οντότητα συναγερμού",
    "repairs": "Αναφορά στις Επισκευές όταν ένας κανόνας εγκαταλείπει",
    "vacation": "Λειτουργία διακοπών",
    "import": "Εισαγωγή",
    "import_help": "Κανόνες που προτείνονται από τις ετικέτες και τους αυτοματισμούς σας. Οι εισαγόμενοι αυτοματισμοί απενεργοποιούνται, δεν διαγράφονται ποτέ. Επίσης τα φώτα παρουσίας του Smart Comfort: αφαιρέστε τα από εκεί μετά την εισαγωγή.",
    "analyze": "Ανάλυση",
    "import_selected": "Εισαγωγή ({n})",
    "nothing_found": "Δεν υπάρχει κάτι για εισαγωγή.",
    "yaml_file_help": "Ολόκληρο το {path}, όπως είναι γραμμένο. Η αποθήκευση ελέγχει πρώτα το YAML και κάθε κανόνα, κρατά αντίγραφο .bak και επανεκκινεί μόνο τους κανόνες που άλλαξαν.",
    "yaml_includes": "Μέρη των ρυθμίσεων προέρχονται από συμπεριλαμβανόμενα αρχεία: επεξεργάζονται σε αυτά ή στις καρτέλες Κανόνες και Δωμάτια.",
    "yaml_storage_help": "Τις ρυθμίσεις τις αποθηκεύει η ενσωμάτωση: εδώ εμφανίζονται σε YAML, μόνο για ανάγνωση. Μεταβείτε σε YAML για να τις επεξεργάζεστε εδώ και στο αρχείο.",
    "copied": "Αντιγράφηκε",
    "revert": "Απόρριψη αλλαγών",
    "unsaved": "Μη αποθηκευμένο",
    "copy": "Αντιγραφή",
    "saved": "Αποθηκεύτηκε",
    "people_home": "{n} στο σπίτι",
    "nobody_home": "Κανείς στο σπίτι",
    "ok": "OK",
    "blocked.vacation": "σε παύση (διακοπές)",
    "blocked.away": "σε παύση (κανείς στο σπίτι)",
    "blocked.alarm": "σε παύση (ο συναγερμός είναι οπλισμένος)",
    "blocked.nap": "σε παύση (μεσημεριανός ύπνος)"
  },
  "sr-Latn": {
    "tabs": {
      "activity": "Aktivnost",
      "rules": "Pravila",
      "rooms": "Prostorije",
      "journal": "Dnevnik",
      "settings": "Podešavanja",
      "yaml": "YAML"
    },
    "subtitle": "Pravila: {rules} · {alerts} · {timers}",
    "alerts_one": "1 uzbuna",
    "alerts_other": "Uzbune: {n}",
    "no_alert": "nema uzbuna",
    "timers_one": "1 tajmer",
    "timers_other": "Tajmeri: {n}",
    "no_timer": "nema tajmera",
    "all_good": "Sve je u redu",
    "in_progress": "U toku",
    "timers": "Isključenja tajmerom",
    "watch": "Nadzor",
    "latest": "Poslednje",
    "see_journal": "Pogledaj dnevnik",
    "acknowledge": "Potvrdi",
    "snooze15": "Pauza 15 min",
    "resume": "Nastavi",
    "extend": "+15 min",
    "turn_off": "Isključi",
    "test": "Testiraj",
    "edit": "Uredi",
    "delete": "Obriši",
    "save": "Sačuvaj",
    "cancel": "Otkaži",
    "close": "Zatvori",
    "new_rule": "Novo pravilo",
    "all": "Sve",
    "rule_yaml": "Pravilo (YAML)",
    "reloaded": "{file} izmenjen u {time} · ponovo učitana pravila: {n}",
    "yaml_invalid": "house_rules.yaml nije ispravan ({where}): {error}. Poslednja ispravna konfiguracija i dalje radi; izmene su pauzirane.",
    "conflict_title": "Datoteka se promenila tokom uređivanja",
    "conflict_file": "Datoteka",
    "conflict_panel": "Panel",
    "keep_file": "Zadrži datoteku",
    "keep_panel": "Zadrži panel",
    "confirm_delete": "Obrisati pravilo {name}?",
    "room": "Prostorija",
    "light": "Svetlo",
    "opening": "Otvor",
    "climate": "Klima",
    "presence": "Prisustvo",
    "illuminance": "Osvetljenost",
    "naps": "Dremke",
    "add_room": "Dodaj prostoriju",
    "rooms_help": "Nazivi prostorija onako kako ih robot prijavljuje. Koriste ih pravila robota i prisustva.",
    "remove": "Ukloni",
    "today": "Današnja pokretanja",
    "search": "Traži pravilo ili entitet",
    "failures": "Neuspesi",
    "source": "Izvor konfiguracije",
    "source_yaml": "YAML",
    "source_storage": "Skladište",
    "modified": "Izmenjeno u {time}",
    "reload": "Ponovo učitaj",
    "switch_yaml": "Pređi na YAML",
    "switch_yaml_help": "Upisuje /config/house_rules.yaml iz trenutne konfiguracije. Od tada je izvor datoteka, koju je moguće uređivati sa obe strane.",
    "yaml_help": "Čuvanje u panelu prepisuje samo blok pravila (po id), komentari ostaju, uz kopiju .bak. Izmene u datoteci se učitavaju za nekoliko sekundi.",
    "conditions": "Opšti uslovi",
    "quiet_hours": "Tihi sati",
    "quiet_help": "Svetla i zvuci utišani, samo obaveštenja (za pravila koja ih poštuju).",
    "notify": "Podrazumevani primalac obaveštenja",
    "alarm": "Entitet alarma",
    "repairs": "Prijava u Popravkama kada pravilo odustane",
    "vacation": "Režim odmora",
    "import": "Uvoz",
    "import_help": "Pravila predložena na osnovu vaših oznaka i automatizacija. Uvezene automatizacije se isključuju, nikada brišu. Takođe i svetla na prisustvo iz Smart Comfort: uklonite ih tamo nakon uvoza.",
    "analyze": "Analiziraj",
    "import_selected": "Uvezi ({n})",
    "nothing_found": "Nema ničega za uvoz.",
    "yaml_file_help": "Ceo {path}, onako kako je napisan. Čuvanje prvo proverava YAML i svako pravilo, zadržava kopiju .bak i ponovo pokreće samo izmenjena pravila.",
    "yaml_includes": "Delovi konfiguracije dolaze iz uključenih datoteka: uređuju se u tim datotekama ili na karticama Pravila i Prostorije.",
    "yaml_storage_help": "Konfiguraciju čuva integracija: ovde je u YAML, samo za čitanje. Pređite na YAML da biste je uređivali ovde i u datoteci.",
    "copied": "Kopirano",
    "revert": "Odbaci izmene",
    "unsaved": "Nije sačuvano",
    "copy": "Kopiraj",
    "saved": "Sačuvano",
    "people_home": "Kod kuće: {n}",
    "nobody_home": "Niko nije kod kuće",
    "ok": "OK",
    "blocked.vacation": "pauzirano (odmor)",
    "blocked.away": "pauzirano (niko nije kod kuće)",
    "blocked.alarm": "pauzirano (alarm aktivan)",
    "blocked.nap": "pauzirano (dremka)"
  }
};

// Shared with the cards module (loaded first by the panel): scene, icons, tones, labels of types/states/results.
const hrs = () => window.__houseRulesShared;
const hrpEsc = (text) => hrs().esc(text);
const HRP_TYPES = [
  'keep_on',
  'auto_off',
  'sensor_flash',
  'sensor_chime',
  'appliance_resume',
  'cycle_done',
  'vacuum_follow',
  'vacuum_guard',
  'presence_light',
  'lock_guard',
  'leak_guard',
];
const HRP_RESULT_TONE = { ok: 'green', skipped: 'grey', active: 'red', failed: 'red' };
// Templates of a new rule, one per type (YAML, edited before saving).
const HRP_TEMPLATES = {
  keep_on: 'id: my_plug\ntype: keep_on\nentity_id: switch.my_plug\ndelay: "00:00:10"\nmax_attempts: 3\n',
  auto_off: 'id: kettle\ntype: auto_off\nentity_id: switch.kettle\nduration: "00:05:00"\n',
  sensor_flash:
    'id: door_alert\ntype: sensor_flash\ntrigger:\n  entity_id: binary_sensor.door\n  to: "on"\n  for: "00:02:00"\nlights: [light.hall]\ncolor: [255, 0, 0]\nrespect: [quiet_hours]\nescalation:\n  - after: "00:05:00"\n    notify: critical\n',
  sensor_chime:
    'id: door_chime\ntype: sensor_chime\ntrigger:\n  entity_id: binary_sensor.front_door\nmedia_player: media_player.living_room\nmedia: media-source://media_source/local/chime.mp3\nvolume: 0.4\nwindows:\n  - {start: "09:00", end: "21:00"}\n',
  appliance_resume:
    'id: dishwasher\ntype: appliance_resume\nswitch: switch.dishwasher\nprogress: sensor.dishwasher_progress\nmax_attempts: 2\n',
  cycle_done:
    'id: washing_machine\ntype: cycle_done\npower_entity: sensor.washing_machine_power\ndone_below: 3\ndone_for: "00:03:00"\ndoor: binary_sensor.washing_machine_door\nreminder: "00:30:00"\n',
  vacuum_follow: 'id: vacuum_lights\ntype: vacuum_follow\nvacuum: vacuum.robot\nroom_sensor: sensor.robot_current_room\ntransition: 10\n',
  vacuum_guard: 'id: vacuum_guard\ntype: vacuum_guard\nvacuum: vacuum.robot\nroom_sensor: sensor.robot_current_room\n',
  presence_light:
    'id: hall_presence\ntype: presence_light\nroom: Hall\ndark_below: 30\non_after: 2\noff_delay: "00:00:30"\nslots:\n  - {start: "22:00", end: "07:00", brightness: 20}\n',
  lock_guard: 'id: front_lock\ntype: lock_guard\nlock: lock.front_door\ndoor: binary_sensor.front_door\nlock_after: "00:00:30"\n',
  leak_guard:
    'id: kitchen_leak\ntype: leak_guard\nsensors: [binary_sensor.sink_leak]\ncut: [switch.dishwasher]\nlights: [light.hall]\n',
};

class HouseRulesPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._data = undefined;
    this._ui = { tab: 'activity', filter: null, editing: null, search: '', jfilter: 'all', rooms: null, settings: null };
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (first) this._subscribe();
  }

  set route(route) {
    const tab = (route?.path || '').replace(/^\//, '').split('/')[0];
    if (tab && this.t('tabs')[tab] && tab !== this._ui.tab) {
      this._ui.tab = tab;
      this._render();
    }
  }

  set narrow(_v) {}
  set panel(_v) {}

  connectedCallback() {
    if (this._hass && !this._unsub) this._subscribe();
  }

  disconnectedCallback() {
    this._unsub?.then((u) => u()).catch(() => {});
    this._unsub = null;
  }

  _subscribe() {
    if (!window.__houseRulesShared) {
      const url = new URL(`./house-rules-cards.js${new URL(import.meta.url).search}`, import.meta.url).href;
      import(url).then(() => this._render());
    }
    this._unsub = this._hass.connection.subscribeMessage(
      (data) => {
        const before = this._data?.source?.modified;
        this._data = data;
        const y = this._ui.yaml;
        if (y && data?.source?.modified !== before && y.text === y.original) this._ui.yaml = null;
        this._render();
      },
      { type: 'house_rules/subscribe' },
    );
    this._unsub.catch(() => {
      this._data = null;
      this._render();
    });
  }

  // ---------- helpers ----------
  t(key, vars = {}) {
    const lang = this._hass?.locale?.language || 'en';
    const table = HRP_STRINGS[lang] || HRP_STRINGS[lang.split('-')[0]] || HRP_STRINGS.en;
    let text = table[key] ?? HRP_STRINGS.en[key];
    if (text === undefined) text = hrs() ? hrs().t(this._hass, key) : key;
    if (typeof text === 'string') for (const [k, v] of Object.entries(vars)) text = text.replace(`{${k}}`, v);
    return text;
  }

  count(key, n, none) {
    if (!n && none) return this.t(none);
    return this.t(n === 1 ? `${key}_one` : `${key}_other`, { n });
  }

  get dark() {
    return Boolean(this._hass?.themes?.darkMode);
  }

  tone(name) {
    const set = hrs().tones[this.dark ? 'dark' : 'light'];
    return set[name] || set.grey;
  }

  icon(icon, tone, size = 40) {
    const [fg, bg] = this.tone(tone);
    return `<div class="ico" style="width:${size}px;height:${size}px;background:${bg};color:${fg}"><ha-icon icon="${icon}"></ha-icon></div>`;
  }

  pill(text, tone) {
    const [fg, bg] = this.tone(tone);
    return `<span class="pill" style="background:${bg};color:${fg}"><span class="dot"></span>${hrpEsc(text)}</span>`;
  }

  time(ts) {
    if (!ts) return '';
    return new Date(ts * 1000).toLocaleTimeString(this._hass?.locale?.language || undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  dur(seconds) {
    return hrs().duration(seconds);
  }

  ws(msg) {
    return this._hass.connection.sendMessagePromise(msg);
  }

  toast(message) {
    this.dispatchEvent(new CustomEvent('hass-notification', { detail: { message }, bubbles: true, composed: true }));
  }

  go(tab) {
    this._ui.tab = tab;
    this._ui.editing = null;
    this._ui.search = '';
    history.replaceState(null, '', `/house-rules/${tab}`);
    this._render();
  }

  // ---------- render ----------
  _render() {
    if (!this._hass || !hrs()) return;
    const focus = this.shadowRoot.activeElement;
    const keep = focus?.id ? { id: focus.id, start: focus.selectionStart, end: focus.selectionEnd } : null;
    const d = this._data;
    let content;
    if (d === undefined) content = '<div class="empty">…</div>';
    else if (d === null) content = '<div class="empty">House Rules is not loaded.</div>';
    else content = this[`tab_${this._ui.tab}`]();
    this.shadowRoot.innerHTML = `<style>${HRP_CSS}${hrs().animCss}</style><div class="page" style="${this.vars()}">${this.top()}<main>${content}</main>${this.dialog()}</div>`;
    this.bind();
    if (keep) {
      const el = this.shadowRoot.getElementById(keep.id);
      if (el) {
        el.focus();
        if (el.setSelectionRange && keep.start != null) el.setSelectionRange(keep.start, keep.end);
      }
    }
  }

  vars() {
    const n = this.dark;
    return `--hr-sky:${n ? '#1E2533' : '#EEF2F8'};--hr-ground:${n ? '#4B5563' : '#C9CED6'};--hr-tile:${n ? 'rgba(255,255,255,.05)' : '#F7F8FA'};--hr-red:${this.tone('red')[0]};--hr-red-bg:${this.tone('red')[1]};`;
  }

  top() {
    const d = this._data || {};
    const alerts = d.alerts?.length || 0;
    const timers = d.timers?.length || 0;
    const sub = this.t('subtitle', {
      rules: d.rules?.length || 0,
      alerts: this.count('alerts', alerts, 'no_alert'),
      timers: this.count('timers', timers, 'no_timer'),
    });
    const status = alerts ? this.pill(this.count('alerts', alerts), 'red') : this.pill(this.t('all_good'), 'green');
    const tabs = Object.entries(this.t('tabs'))
      .map(
        ([k, label]) =>
          `<button class="tab ${k === this._ui.tab ? 'on' : ''}" data-tab="${k}" role="tab" aria-selected="${k === this._ui.tab}">${hrpEsc(label)}</button>`,
      )
      .join('');
    const scene = hrs().scene(d.rules || [], this.dark);
    return `<header class="hdr">${scene}<div class="ground"></div><div class="hdrc"><button class="rbtn menu" data-action="menu" aria-label="Menu"><ha-icon icon="mdi:menu"></ha-icon></button>${this.icon('house-rules:emblem', alerts ? 'red' : 'indigo')}<div class="grow"><div class="ttl" style="font-size:20px;line-height:24px">House Rules</div><div class="sub">${hrpEsc(sub)}</div></div><div class="row">${status}<button class="rbtn" data-action="reload" aria-label="${this.t('reload')}" title="${this.t('reload')}"><ha-icon icon="mdi:refresh"></ha-icon></button><button class="rbtn" data-action="new" aria-label="${this.t('new_rule')}" title="${this.t('new_rule')}"><ha-icon icon="mdi:plus"></ha-icon></button></div></div></header><nav class="tabs" role="tablist">${tabs}</nav>`;
  }

  tile(icon, tone, name, state, extra = '') {
    const [fg] = this.tone(tone);
    return `<div class="tile"><span class="badge" style="background:${fg}"></span>${this.icon(icon, tone)}<div class="grow"><div class="tname">${hrpEsc(name)}</div><div class="tstate" style="color:${fg}">${hrpEsc(state)}</div>${extra}</div></div>`;
  }

  ruleLine(r) {
    let text = this.t(`state.${r.state}`);
    if (r.blocked) text = this.t(`blocked.${r.blocked}`);
    if (r.detail) text += ` · ${r.detail}`;
    return text;
  }

  ring(timer, size = 64) {
    const left = Math.max(0, timer.ends - Date.now() / 1000);
    const pct = Math.max(0, Math.min(1, left / timer.total));
    const r = 26;
    const c = 2 * Math.PI * r;
    return `<div style="position:relative;width:${size}px;height:${size}px;flex:none"><svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 64 64"><circle cx="32" cy="32" r="${r}" fill="none" stroke="var(--divider-color)" stroke-width="6"/><circle cx="32" cy="32" r="${r}" fill="none" stroke="${this.tone('amber')[0]}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - pct)).toFixed(1)}" transform="rotate(-90 32 32)"/></svg><div class="ringlabel">${this.dur(left)}</div></div>`;
  }

  journalRow(e, wide = false) {
    const tone = HRP_RESULT_TONE[e.result] || 'grey';
    const icon = hrs().icons[e.type] || 'mdi:information-outline';
    if (!wide)
      return `<li><span class="when">${this.time(e.ts)}</span>${this.icon(icon, tone, 32)}<div class="grow"><div class="lname">${hrpEsc(e.name || e.rule || '')}</div><div class="sub small">${hrpEsc(e.detail)}</div></div></li>`;
    return `<tr><td class="when">${this.time(e.ts)}</td><td><div class="row">${this.icon(icon, tone, 32)}<div><div class="lname">${hrpEsc(e.name || e.rule || '')}</div><div class="sub small">${hrpEsc(this.t(`type.${e.type}`))} · ${hrpEsc(e.action)}</div></div></div></td><td class="sub small">${hrpEsc(e.detail)}</td><td>${this.pill(this.t(`result.${e.result}`), tone)}</td></tr>`;
  }

  // ---------- tab: activity ----------
  tab_activity() {
    const d = this._data;
    const alerts = (d.alerts || [])
      .map(
        (a) =>
          `<div class="banner">${this.icon(hrs().icons[a.type] || 'mdi:alarm-light-outline', 'red')}<div class="grow"><div class="tname wrap">${hrpEsc(a.name)}</div><div class="sub">${hrpEsc(a.detail || '')}${a.attributes?.levels ? ` · ${a.attributes.level}/${a.attributes.levels}` : ''}</div></div><div class="row"><button class="btn" data-snooze="${hrpEsc(a.id)}">${this.t('snooze15')}</button><button class="btn red" data-ack="${hrpEsc(a.id)}">${this.t('acknowledge')}</button></div></div>`,
      )
      .join('');
    const timers = (d.timers || [])
      .map(
        (t) =>
          `<div class="tile" style="gap:14px">${this.ring(t)}<div class="grow"><div class="tname">${hrpEsc(t.name)}</div><div class="sub small">${hrpEsc(t.entity_id)}</div><div class="row" style="margin-top:8px"><button class="btn sm" data-extend="${hrpEsc(t.entity_id)}">${this.t('extend')}</button><button class="btn sm" data-off="${hrpEsc(t.entity_id)}">${this.t('turn_off')}</button></div></div></div>`,
      )
      .join('');
    const watch = (d.rules || [])
      .filter((r) => r.state !== 'alert')
      .map((r) => this.tile(hrs().icons[r.type], hrs().tone[r.state] || 'grey', r.name, this.ruleLine(r)))
      .join('');
    const latest = [...(d.journal || [])]
      .reverse()
      .slice(0, 8)
      .map((e) => this.journalRow(e))
      .join('');
    return `<div class="cols"><div class="main">${alerts ? `<section><h2>${this.t('in_progress')}</h2>${alerts}</section>` : ''}${timers ? `<section><h2>${this.t('timers')} · ${(d.timers || []).length}</h2><div class="tiles">${timers}</div></section>` : ''}<section><h2>${this.t('watch')}</h2><div class="tiles">${watch}</div></section></div><aside class="card side"><h2>${this.t('latest')}</h2><ul>${latest}</ul><button class="link" data-tab="journal">${this.t('see_journal')}</button></aside></div>`;
  }

  // ---------- tab: rules ----------
  tab_rules() {
    const d = this._data;
    const src = d.source || {};
    let banner = '';
    if (src.error) {
      const where = `${(src.error.file || '').split('/').pop()}${src.error.line ? `:${src.error.line}` : ''}`;
      banner = `<div class="note red">${hrpEsc(this.t('yaml_invalid', { where, error: src.error.message }))}</div>`;
    } else if (src.last_reload && Date.now() / 1000 - src.last_reload.ts < 300 && src.last_reload.rules?.length) {
      banner = `<div class="note"><ha-icon icon="mdi:refresh"></ha-icon><b>${hrpEsc(this.t('reloaded', { file: 'house_rules.yaml', time: this.time(src.last_reload.ts), n: src.last_reload.rules.length }))}</b> · ${hrpEsc(src.last_reload.rules.join(', '))}</div>`;
    }
    const used = HRP_TYPES.filter((t) => (d.rules || []).some((r) => r.type === t));
    const chips = [
      `<button class="chip ${!this._ui.filter ? 'on' : ''}" data-filter="">${this.t('all')} · ${(d.rules || []).length}</button>`,
      ...used.map(
        (t) =>
          `<button class="chip ${this._ui.filter === t ? 'on' : ''}" data-filter="${t}">${hrpEsc(this.t(`type.${t}`))} · ${(d.rules || []).filter((r) => r.type === t).length}</button>`,
      ),
    ].join('');
    const groups = used
      .filter((t) => !this._ui.filter || this._ui.filter === t)
      .map((t) => {
        const rows = (d.rules || [])
          .filter((r) => r.type === t)
          .map((r) => {
            const tone = hrs().tone[r.state] || 'grey';
            const sel = this._ui.editing?.previous_id === r.id;
            return `<div class="rrow ${sel ? 'sel' : ''}">${this.icon(hrs().icons[r.type], tone)}<div class="grow"><div class="tname">${hrpEsc(r.name)}</div><div class="tstate" style="color:${this.tone(tone)[0]}">${hrpEsc(this.ruleLine(r))}</div><div class="sub small">${hrpEsc(r.id)}</div></div><div class="acts"><button class="btn sm" data-test="${hrpEsc(r.id)}"><ha-icon icon="mdi:play" style="--mdc-icon-size:14px"></ha-icon>${this.t('test')}</button>${r.state === 'snoozed' ? `<button class="btn sm" data-unsnooze="${hrpEsc(r.id)}">${this.t('resume')}</button>` : ''}<label class="sw"><input type="checkbox" data-enable="${hrpEsc(r.id)}" ${r.state !== 'disabled' ? 'checked' : ''} aria-label="${hrpEsc(r.name)}"><span></span></label><button class="btn sm" data-edit="${hrpEsc(r.id)}">${this.t('edit')}</button></div></div>`;
          })
          .join('');
        return `<section><h2>${hrpEsc(this.t(`type.${t}`))}</h2>${rows}</section>`;
      })
      .join('');
    const errors = Object.entries(d.errors || {})
      .map(([k, v]) => `<div class="note red"><b>${hrpEsc(k)}</b> · ${hrpEsc(v)}</div>`)
      .join('');
    return `<div class="stack">${banner}${errors}<div class="chips">${chips}</div><div class="cols"><div class="main">${groups || `<div class="empty">${this.t('new_rule')} +</div>`}</div>${this.editor()}</div></div>`;
  }

  editor() {
    const e = this._ui.editing;
    if (!e) return '';
    const types = HRP_TYPES.map((t) => `<option value="${t}">${hrpEsc(this.t(`type.${t}`))}</option>`).join('');
    const locked = this._data?.source?.error;
    return `<aside class="card side editor"><div class="row"><div class="grow"><div class="ttl">${hrpEsc(e.previous_id || this.t('new_rule'))}</div><div class="sub">${this.t('rule_yaml')}</div></div><button class="rbtn" data-action="close" aria-label="${this.t('close')}"><ha-icon icon="mdi:close"></ha-icon></button></div>${!e.previous_id ? `<label class="field"><span>Type</span><select id="hrp-type">${types}</select></label>` : ''}<label class="field"><span>YAML</span><textarea id="hrp-yaml" spellcheck="false" ${locked ? 'disabled' : ''}>${hrpEsc(e.text)}</textarea></label>${e.error ? `<div class="note red">${hrpEsc(e.error)}</div>` : ''}<div class="row end">${e.previous_id ? `<button class="btn red" data-action="delete">${this.t('delete')}</button>` : ''}<button class="btn" data-action="close">${this.t('cancel')}</button><button class="btn primary" data-action="save" ${locked ? 'disabled' : ''}>${this.t('save')}</button></div></aside>`;
  }

  // ---------- tab: rooms ----------
  tab_rooms() {
    const rooms = this._ui.rooms || JSON.parse(JSON.stringify(this._data.rooms || {}));
    this._ui.rooms = rooms;
    const fields = ['light', 'opening', 'climate', 'presence', 'illuminance', 'naps'];
    const head = `<tr><th>${this.t('room')}</th>${fields.map((f) => `<th>${this.t(f)}</th>`).join('')}<th></th></tr>`;
    const rows = Object.entries(rooms)
      .map(([name, room], i) => {
        const cells = fields
          .map((f) => {
            let v = room[f] ?? '';
            if (f === 'naps') v = hrpNapsText(v);
            else if (Array.isArray(v)) v = v.join(', ');
            const st = (Array.isArray(room[f]) ? room[f][0] : room[f]) && this._hass.states[Array.isArray(room[f]) ? room[f][0] : room[f]];
            return `<td><input class="cell" id="room-${i}-${f}" data-room="${i}" data-field="${f}" value="${hrpEsc(v)}" placeholder="${f === 'naps' ? '13:30-15:00; schedule.nap_bedroom' : '—'}" aria-label="${hrpEsc(name)} ${this.t(f)}">${st ? `<div class="sub small">${hrpEsc(st.state)}${st.attributes?.unit_of_measurement ? ` ${hrpEsc(st.attributes.unit_of_measurement)}` : ''}</div>` : ''}</td>`;
          })
          .join('');
        return `<tr><td><input class="cell name" id="room-${i}-name" data-room="${i}" data-field="__name" value="${hrpEsc(name)}" aria-label="${this.t('room')}"></td>${cells}<td><button class="rbtn plain" data-remove-room="${i}" aria-label="${this.t('remove')}"><ha-icon icon="mdi:delete-outline"></ha-icon></button></td></tr>`;
      })
      .join('');
    const dirty = JSON.stringify(rooms) !== JSON.stringify(this._data.rooms || {});
    return `<div class="stack"><div class="row wrap"><div class="grow"><div class="ttl">${this.t('tabs').rooms}</div><div class="sub">${this.t('rooms_help')}</div></div><button class="btn" data-action="add-room"><ha-icon icon="mdi:plus" style="--mdc-icon-size:16px"></ha-icon>${this.t('add_room')}</button>${dirty ? `<button class="btn" data-action="reset-rooms">${this.t('cancel')}</button><button class="btn primary" data-action="save-rooms">${this.t('save')}</button>` : ''}</div><div class="card scroll"><table>${head}${rows}</table></div></div>`;
  }

  // ---------- tab: journal ----------
  tab_journal() {
    const d = this._data;
    const today = new Date().toDateString();
    const journal = [...(d.journal || [])].reverse();
    const stat = (icon, tone, value, label) =>
      `<div class="tile" style="flex:1 1 180px">${this.icon(icon, tone)}<div><div class="ttl" style="font-size:22px;line-height:26px">${value}</div><div class="sub">${hrpEsc(label)}</div></div></div>`;
    const stats = [
      stat('mdi:play', 'indigo', journal.filter((e) => new Date(e.ts * 1000).toDateString() === today).length, this.t('today')),
      stat('mdi:alarm-light-outline', 'red', (d.alerts || []).length, this.count('alerts', (d.alerts || []).length)),
      stat('mdi:close-circle-outline', 'red', journal.filter((e) => e.result === 'failed').length, this.t('failures')),
    ].join('');
    const filters = {
      all: null,
      alerts: ['sensor_flash', 'leak_guard', 'vacuum_guard'],
      plugs: ['keep_on', 'auto_off'],
      lights: ['presence_light', 'vacuum_follow'],
      appliances: ['appliance_resume', 'cycle_done'],
      failures: 'failed',
    };
    const labels = {
      all: this.t('all'),
      alerts: this.count('alerts', 2).replace(/^\d+\s*/, ''),
      plugs: this.t('type.keep_on'),
      lights: this.t('light'),
      appliances: this.t('type.appliance_resume'),
      failures: this.t('failures'),
    };
    const chips = Object.keys(filters)
      .map((k) => `<button class="chip ${this._ui.jfilter === k ? 'on' : ''}" data-jfilter="${k}">${hrpEsc(labels[k])}</button>`)
      .join('');
    const f = filters[this._ui.jfilter];
    const q = this._ui.search.toLowerCase();
    const items = journal.filter((e) => {
      if (f === 'failed' && e.result !== 'failed') return false;
      if (Array.isArray(f) && !f.includes(e.type)) return false;
      return !q || `${e.name} ${e.rule} ${e.detail}`.toLowerCase().includes(q);
    });
    const days = {};
    for (const e of items) (days[new Date(e.ts * 1000).toLocaleDateString(this._hass.locale?.language)] ||= []).push(e);
    const tables = Object.entries(days)
      .map(([day, list]) => `<h2>${hrpEsc(day)}</h2><div class="card scroll"><table>${list.map((e) => this.journalRow(e, true)).join('')}</table></div>`)
      .join('');
    return `<div class="stack"><div class="row wrap">${stats}</div><div class="row wrap"><div class="chips">${chips}</div><span class="grow"></span><input id="hrp-search" class="cell" style="width:280px" placeholder="${this.t('search')}" value="${hrpEsc(this._ui.search)}" aria-label="${this.t('search')}"></div>${tables || `<div class="empty">—</div>`}</div>`;
  }

  // ---------- tab: yaml ----------
  tab_yaml() {
    const y = this._ui.yaml;
    if (!y) {
      this.loadYaml();
      return '<div class="empty">…</div>';
    }
    const file = y.mode === 'yaml';
    const dirty = file && y.text !== y.original;
    const help = file ? this.t('yaml_file_help', { path: y.path || 'house_rules.yaml' }) : this.t('yaml_storage_help');
    const err = y.error ? `<div class="note red">${hrpEsc(y.error)}</div>` : '';
    const inc = file && y.includes ? `<div class="note">${this.t('yaml_includes')}</div>` : '';
    return `<div class="stack"><div class="row wrap">${this.pill(file ? this.t('source_yaml') : this.t('source_storage'), file ? 'indigo' : 'grey')}<div class="grow sub">${hrpEsc(help)}</div>${dirty ? this.pill(this.t('unsaved'), 'amber') : ''}<button class="btn" data-action="copy">${this.t('copy')}</button>${file ? `${dirty ? `<button class="btn" data-action="yaml-revert">${this.t('revert')}</button>` : ''}<button class="btn primary" data-action="yaml-save" ${dirty ? '' : 'disabled'}>${this.t('save')}</button>` : `<button class="btn primary" data-action="switch-yaml">${this.t('switch_yaml')}</button>`}</div>${inc}${err}<textarea id="hrp-file" class="file" spellcheck="false" ${file ? '' : 'readonly'} aria-label="YAML">${hrpEsc(y.text)}</textarea></div>`;
  }

  async loadYaml() {
    if (this._loadingYaml) return;
    this._loadingYaml = true;
    try {
      const res = await this.ws({ type: 'house_rules/yaml/get' });
      this._ui.yaml = { ...res, original: res.text, error: null };
    } catch (err) {
      this._ui.yaml = { mode: 'storage', text: '', original: '', error: err?.message || String(err) };
    }
    this._loadingYaml = false;
    this._render();
  }

  async saveYaml() {
    const y = this._ui.yaml;
    try {
      await this.ws({ type: 'house_rules/yaml/save', text: y.text, hash: y.hash });
      this._ui.yaml = null;
      this.toast(this.t('saved'));
      await this.loadYaml();
    } catch (err) {
      if (err?.code === 'conflict') {
        this._ui.conflict = { current: err.data?.current || '', mine: y.text, file: err.data?.file, whole: true, hash: err.data?.hash };
      } else {
        const line = err?.data?.line ? ` (${err.data.line})` : '';
        y.error = `${err?.message || String(err)}${line}`;
      }
      this._render();
    }
  }

  // ---------- tab: settings ----------
  tab_settings() {
    const d = this._data;
    const src = d.source || {};
    const s = this._ui.settings || JSON.parse(JSON.stringify(d.settings || {}));
    this._ui.settings = s;
    const row = (title, help, ctrl) =>
      `<div class="srow"><div class="grow" style="flex:1 1 300px"><div class="lname">${hrpEsc(title)}</div><div class="sub small">${hrpEsc(help)}</div></div>${ctrl}</div>`;
    const sourceBlock =
      src.mode === 'yaml'
        ? `<div class="srcbar">${this.pill(this.t('source_yaml'), 'indigo')}<code class="grow">${hrpEsc(src.path)}</code><span class="sub small">${src.modified ? hrpEsc(this.t('modified', { time: this.time(src.modified) })) : ''}${src.files?.length > 1 ? ` · ${src.files.length} files` : ''}</span><button class="btn sm" data-action="reload"><ha-icon icon="mdi:refresh" style="--mdc-icon-size:14px"></ha-icon>${this.t('reload')}</button></div>${src.error ? `<div class="note red">${hrpEsc(src.error.message)}</div>` : ''}<p class="sub small">${this.t('yaml_help')}</p>`
        : `<div class="srcbar">${this.pill(this.t('source_storage'), 'grey')}<span class="grow sub small">${this.t('switch_yaml_help')}</span><button class="btn primary" data-action="switch-yaml">${this.t('switch_yaml')}</button></div>`;
    const qh = s.quiet_hours || {};
    const dirty = JSON.stringify(s) !== JSON.stringify(d.settings || {});
    const proposals = this._ui.proposals;
    let importBody = `<button class="btn" data-action="analyze">${this.t('analyze')}</button>`;
    if (proposals) {
      importBody = proposals.length
        ? `${proposals
            .map(
              (p, i) =>
                `<label class="prow"><input type="checkbox" data-prop="${i}" ${p.checked ? 'checked' : ''}>${this.icon(hrs().icons[p.rule.type], 'indigo', 32)}<div class="grow"><div class="lname">${hrpEsc(p.rule.name || p.rule.id)}</div><div class="sub small">${hrpEsc(this.t(`type.${p.rule.type}`))} · ${hrpEsc(p.source === 'label' ? `label « ${p.label} »` : p.automation_entity || p.alias)}</div></div></label>`,
            )
            .join('')}<div class="row end"><button class="btn primary" data-action="import">${this.t('import_selected', { n: proposals.filter((p) => p.checked).length })}</button></div>`
        : `<div class="sub">${this.t('nothing_found')}</div>`;
    }
    const people = d.conditions?.people_home;
    return `<div class="grid2">
      <section class="card pad"><div class="row">${this.icon('mdi:file-code-outline', 'indigo')}<div class="ttl">${this.t('source')}</div></div>${sourceBlock}
      </section>
      <section class="card pad"><div class="row">${this.icon('mdi:filter-outline', 'indigo')}<div class="ttl">${this.t('conditions')}</div></div>
        ${row(this.t('quiet_hours'), this.t('quiet_help'), `<div class="row"><input type="time" class="cell" id="qh-start" value="${hrpEsc((qh.start || '').slice(0, 5))}" aria-label="start"><span>→</span><input type="time" class="cell" id="qh-end" value="${hrpEsc((qh.end || '').slice(0, 5))}" aria-label="end"></div>`)}
        ${row(this.t('vacation'), people ? this.t('people_home', { n: people }) : this.t('nobody_home'), `<label class="sw"><input type="checkbox" data-action="vacation" ${d.conditions?.vacation ? 'checked' : ''} aria-label="${this.t('vacation')}"><span></span></label>`)}
        ${row(this.t('alarm'), '', `<input class="cell" id="set-alarm" value="${hrpEsc(s.alarm || '')}" placeholder="alarm_control_panel.…" aria-label="${this.t('alarm')}">`)}
        ${row(this.t('notify'), '', `<input class="cell" id="set-notify" value="${hrpEsc(s.notify || '')}" placeholder="notify.…" aria-label="${this.t('notify')}">`)}
        ${row(this.t('repairs'), '', `<label class="sw"><input type="checkbox" id="set-repairs" ${s.repairs !== false ? 'checked' : ''} aria-label="${this.t('repairs')}"><span></span></label>`)}
        ${dirty ? `<div class="row end"><button class="btn" data-action="reset-settings">${this.t('cancel')}</button><button class="btn primary" data-action="save-settings">${this.t('save')}</button></div>` : ''}
      </section>
      <section class="card pad"><div class="row">${this.icon('mdi:import', 'indigo')}<div class="ttl">${this.t('import')}</div></div><p class="sub small">${this.t('import_help')}</p>${importBody}</section>
    </div>`;
  }

  dialog() {
    const c = this._ui.conflict;
    if (!c) return '';
    return `<div class="scrim"><div class="card dlg" role="dialog" aria-modal="true" aria-label="${this.t('conflict_title')}"><div class="row">${this.icon('mdi:file-alert-outline', 'amber')}<div class="ttl grow">${this.t('conflict_title')}</div></div><div class="sub small">${hrpEsc(c.file || '')}</div><div class="grid2 tight"><div class="diff a"><b>${this.t('conflict_file')}</b><pre>${hrpEsc(c.current || '')}</pre></div><div class="diff b"><b>${this.t('conflict_panel')}</b><pre>${hrpEsc(c.mine || '')}</pre></div></div><div class="row end"><button class="btn" data-action="keep-file">${this.t('keep_file')}</button><button class="btn primary" data-action="keep-panel">${this.t('keep_panel')}</button></div></div></div>`;
  }

  // ---------- events ----------
  bind() {
    const root = this.shadowRoot;
    const on = (sel, ev, fn) => {
      for (const el of root.querySelectorAll(sel)) el.addEventListener(ev, (e) => fn(el, e));
    };
    on('[data-tab]', 'click', (el) => this.go(el.dataset.tab));
    on('[data-filter]', 'click', (el) => {
      this._ui.filter = el.dataset.filter || null;
      this._render();
    });
    on('[data-jfilter]', 'click', (el) => {
      this._ui.jfilter = el.dataset.jfilter;
      this._render();
    });
    on('#hrp-search', 'input', (el) => {
      this._ui.search = el.value;
      this._render();
    });
    on('[data-ack]', 'click', (el) => this.ws({ type: 'house_rules/action', rule: el.dataset.ack, action: 'acknowledge' }));
    on('[data-snooze]', 'click', (el) => this.ws({ type: 'house_rules/action', rule: el.dataset.snooze, action: 'snooze', minutes: 15 }));
    on('[data-unsnooze]', 'click', (el) => this.ws({ type: 'house_rules/action', rule: el.dataset.unsnooze, action: 'snooze', minutes: 0 }));
    on('[data-test]', 'click', (el) => this.ws({ type: 'house_rules/action', rule: el.dataset.test, action: 'test' }));
    on('[data-extend]', 'click', (el) => this.ws({ type: 'house_rules/timer', entity_id: el.dataset.extend, action: 'extend', minutes: 15 }));
    on('[data-off]', 'click', (el) => this.ws({ type: 'house_rules/timer', entity_id: el.dataset.off, action: 'off' }));
    on('[data-enable]', 'change', (el) => this.toggleRule(el.dataset.enable, el.checked));
    on('[data-edit]', 'click', (el) => this.edit(el.dataset.edit));
    on('#hrp-file', 'input', (el) => {
      const y = this._ui.yaml;
      const was = y.text !== y.original;
      y.text = el.value;
      if (was !== (y.text !== y.original)) this._render();
    });
    on('#hrp-yaml', 'input', (el) => {
      this._ui.editing.text = el.value;
    });
    on('#hrp-type', 'change', (el) => {
      this._ui.editing.text = HRP_TEMPLATES[el.value];
      this._render();
    });
    on('[data-room]', 'input', (el) => this.roomInput(el));
    on('[data-remove-room]', 'click', (el) => {
      const entries = Object.entries(this._ui.rooms);
      entries.splice(Number(el.dataset.removeRoom), 1);
      this._ui.rooms = Object.fromEntries(entries);
      this._render();
    });
    on('[data-prop]', 'change', (el) => {
      this._ui.proposals[Number(el.dataset.prop)].checked = el.checked;
      this._render();
    });
    on('#qh-start, #qh-end, #set-alarm, #set-notify', 'input', () => this.settingsInput(false));
    on('#qh-start, #qh-end, #set-alarm, #set-notify, #set-repairs', 'change', () => this.settingsInput(true));
    on('[data-action]', 'click', (el, ev) => {
      if (el.tagName === 'INPUT') return;
      ev.preventDefault();
      this.action(el.dataset.action);
    });
    on('input[data-action="vacation"]', 'change', (el) => this.ws({ type: 'house_rules/vacation', value: el.checked }));
  }

  async action(name) {
    try {
      switch (name) {
        case 'menu':
          this.dispatchEvent(new Event('hass-toggle-menu', { bubbles: true, composed: true }));
          break;
        case 'reload': {
          await this.ws({ type: 'house_rules/reload' });
          break;
        }
        case 'new':
          this._ui.tab = 'rules';
          this._ui.editing = { previous_id: null, text: HRP_TEMPLATES.keep_on, error: null };
          this._render();
          break;
        case 'close':
          this._ui.editing = null;
          this._render();
          break;
        case 'save':
          await this.saveRule();
          break;
        case 'delete': {
          const id = this._ui.editing.previous_id;
          if (!confirm(this.t('confirm_delete', { name: id }))) return;
          await this.ws({ type: 'house_rules/rule/delete', rule_id: id });
          this._ui.editing = null;
          this._render();
          break;
        }
        case 'keep-file': {
          const c = this._ui.conflict;
          this._ui.conflict = null;
          if (c.whole) {
            this._ui.yaml = null;
            await this.loadYaml();
            break;
          }
          await this.ws({ type: 'house_rules/reload' });
          if (this._ui.editing) this._ui.editing.text = c.current || this._ui.editing.text;
          this._render();
          break;
        }
        case 'keep-panel':
          if (this._ui.conflict?.whole) {
            this._ui.yaml.hash = this._ui.conflict.hash;
            this._ui.conflict = null;
            await this.saveYaml();
            break;
          }
          this._ui.conflict = null;
          await this.ws({ type: 'house_rules/reload' });
          await this.saveRule();
          break;
        case 'add-room': {
          let n = 1;
          while (this._ui.rooms[`Room ${n}`]) n++;
          this._ui.rooms[`Room ${n}`] = {};
          this._render();
          break;
        }
        case 'reset-rooms':
          this._ui.rooms = null;
          this._render();
          break;
        case 'save-rooms':
          await this.ws({ type: 'house_rules/section/save', section: 'rooms', value: this.cleanRooms() });
          this._ui.rooms = null;
          this.toast(this.t('saved'));
          break;
        case 'reset-settings':
          this._ui.settings = null;
          this._render();
          break;
        case 'save-settings':
          await this.ws({ type: 'house_rules/section/save', section: 'settings', value: this.cleanSettings() });
          this._ui.settings = null;
          this.toast(this.t('saved'));
          break;
        case 'switch-yaml':
          await this.ws({ type: 'house_rules/yaml/enable' });
          break;
        case 'copy':
          await navigator.clipboard?.writeText(this._ui.yaml?.text || '');
          this.toast(this.t('copied'));
          break;
        case 'yaml-revert':
          this._ui.yaml = null;
          await this.loadYaml();
          break;
        case 'yaml-save':
          await this.saveYaml();
          break;
        case 'analyze': {
          const res = await this.ws({ type: 'house_rules/import/analyze' });
          this._ui.proposals = (res.proposals || []).map((p) => ({ ...p, checked: true }));
          this._render();
          break;
        }
        case 'import': {
          const chosen = this._ui.proposals.filter((p) => p.checked);
          const rooms = {};
          for (const p of chosen) Object.assign(rooms, p.rooms || {});
          await this.ws({
            type: 'house_rules/import/apply',
            rules: chosen.map((p) => p.rule),
            rooms,
            automations: chosen.map((p) => p.automation_entity).filter(Boolean),
          });
          this._ui.proposals = null;
          this.toast(this.t('saved'));
          this.go('rules');
          break;
        }
      }
    } catch (err) {
      this.toast(err?.message || String(err));
    }
  }

  async toggleRule(id, enabled) {
    try {
      const res = await this.ws({ type: 'house_rules/rule/yaml', rule_id: id });
      let text = res.yaml || '';
      text = text.replace(/^enabled:.*\n?/m, '');
      if (!enabled) text = `${text.trimEnd()}\nenabled: false\n`;
      await this.ws({ type: 'house_rules/rule/save', yaml: text, previous_id: id });
    } catch (err) {
      this.toast(err?.message || String(err));
      this._render();
    }
  }

  async edit(id) {
    const res = await this.ws({ type: 'house_rules/rule/yaml', rule_id: id });
    this._ui.editing = { previous_id: id, text: res.yaml || '', error: null };
    this._render();
  }

  async saveRule() {
    const e = this._ui.editing;
    if (!e) return;
    try {
      await this.ws({ type: 'house_rules/rule/save', yaml: e.text, previous_id: e.previous_id || undefined });
      this._ui.editing = null;
      this.toast(this.t('saved'));
      this._render();
    } catch (err) {
      if (err?.code === 'conflict') {
        this._ui.conflict = { current: err.data?.current || '', mine: e.text, file: err.data?.file };
      } else {
        e.error = err?.message || String(err);
      }
      this._render();
    }
  }

  roomInput(el) {
    const entries = Object.entries(this._ui.rooms);
    const i = Number(el.dataset.room);
    const [name, room] = entries[i];
    if (el.dataset.field === '__name') {
      entries[i] = [el.value, room];
    } else {
      const value = el.value.trim();
      if (!value) delete room[el.dataset.field];
      else if (el.dataset.field === 'naps') room.naps = hrpNapsParse(value);
      else if (['opening', 'presence'].includes(el.dataset.field) && value.includes(','))
        room[el.dataset.field] = value
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean);
      else room[el.dataset.field] = value;
      entries[i] = [name, room];
    }
    this._ui.rooms = Object.fromEntries(entries);
    const dirtyBtn = this.shadowRoot.querySelector('[data-action="save-rooms"]');
    if (!dirtyBtn) this._render();
  }

  cleanRooms() {
    const out = {};
    for (const [name, room] of Object.entries(this._ui.rooms || {})) {
      if (!name.trim()) continue;
      out[name.trim()] = Object.fromEntries(Object.entries(room).filter(([, v]) => v !== '' && v != null));
    }
    return out;
  }

  settingsInput(render) {
    const r = this.shadowRoot;
    const s = this._ui.settings;
    const start = r.getElementById('qh-start').value;
    const end = r.getElementById('qh-end').value;
    s.quiet_hours = start && end ? { start, end } : null;
    s.alarm = r.getElementById('set-alarm').value.trim() || null;
    s.notify = r.getElementById('set-notify').value.trim() || null;
    s.repairs = r.getElementById('set-repairs').checked;
    // Typing only updates the draft (a redraw would drop the caret); the buttons appear once it differs.
    const shown = Boolean(r.querySelector('[data-action="save-settings"]'));
    const dirty = JSON.stringify(s) !== JSON.stringify(this._data.settings || {});
    if (render || shown !== dirty) this._render();
  }

  cleanSettings() {
    // quiet_hours: null is kept (no quiet hours); other empty values go (their default applies).
    return Object.fromEntries(
      Object.entries(this._ui.settings || {}).filter(([k, v]) => k === 'quiet_hours' || (v !== null && v !== '')),
    );
  }
}

const HRP_CSS = `
  :host { display: block; height: 100%; background: var(--primary-background-color); color: var(--primary-text-color); }
  .page { min-height: 100%; }
  .hdr { position: relative; height: 96px; overflow: hidden; background: var(--hr-sky); }
  .hdr .hr-scene { position: absolute; right: 24px; bottom: 5px; opacity: .9; }
  .hdr .ground { position: absolute; left: 0; right: 0; bottom: 0; height: 5px; background: var(--hr-ground); }
  .hdrc { position: absolute; left: 16px; right: 24px; top: 22px; display: flex; align-items: center; gap: 12px; }
  .hdrc .row { margin-right: min(360px, 30vw); }
  .menu { display: none; }
  @media (max-width: 870px) { .menu { display: inline-flex; } .hdrc .row { margin-right: 0; } .hdr .hr-scene { opacity: .35; } }
  .tabs { display: flex; flex-wrap: wrap; padding: 0 24px; background: var(--card-background-color); border-bottom: 1px solid var(--divider-color); }
  .tab { padding: 12px 4px; margin-right: 24px; font-family: inherit; font-weight: 600; font-size: 14px; color: var(--secondary-text-color); background: none; border: 0; border-bottom: 3px solid transparent; cursor: pointer; }
  .tab.on { color: var(--primary-text-color); font-weight: 700; border-bottom-color: var(--primary-color); }
  main { max-width: 1232px; margin: 0 auto; padding: 24px; box-sizing: border-box; }
  h2 { font-size: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--secondary-text-color); margin: 0 0 8px; }
  section { display: flex; flex-direction: column; gap: 8px; }
  .stack { display: flex; flex-direction: column; gap: 16px; }
  .cols { display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start; }
  .main { flex: 999 1 560px; min-width: 0; display: flex; flex-direction: column; gap: 24px; }
  .side { flex: 1 1 320px; min-width: 0; padding: 16px; }
  .editor { display: flex; flex-direction: column; gap: 14px; position: sticky; top: 12px; }
  .card { background: var(--card-background-color); border-radius: 16px; box-shadow: 0 0 0 1px var(--divider-color); }
  .pad { padding: 16px 20px; display: flex; flex-direction: column; gap: 10px; }
  .grid2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(520px, 100%), 1fr)); gap: 20px; align-items: start; }
  .grid2.tight { gap: 10px; }
  .tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
  .tile { position: relative; display: flex; gap: 12px; align-items: center; padding: 12px; border-radius: 12px; background: var(--hr-tile); min-width: 0; }
  .rrow { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 12px; background: var(--hr-tile); }
  .rrow .grow { flex: 1; min-width: 0; }
  .rrow .acts { display: flex; align-items: center; gap: 8px; flex: none; }
  @media (max-width: 600px) { .rrow { flex-wrap: wrap; } .rrow .acts { width: 100%; justify-content: flex-end; } }
  .rrow.sel { box-shadow: inset 0 0 0 2px var(--primary-color); }
  .ico { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex: none; }
  .ico ha-icon { --mdc-icon-size: 22px; }
  .ttl { font-weight: 700; font-size: 16px; line-height: 20px; }
  .sub { font-size: 13px; line-height: 18px; color: var(--secondary-text-color); }
  .small { font-size: 12px; line-height: 16px; }
  .grow { flex: 1; min-width: 0; }
  .row { display: flex; gap: 8px; align-items: center; }
  .row.wrap { flex-wrap: wrap; }
  .row.end { justify-content: flex-end; flex-wrap: wrap; }
  .tname { font-weight: 700; font-size: 14px; line-height: 18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tname.wrap { white-space: normal; }
  .lname { font-size: 13px; font-weight: 600; }
  .tstate { font-size: 12px; line-height: 16px; font-weight: 600; }
  .badge { position: absolute; top: 8px; right: 8px; width: 9px; height: 9px; border-radius: 50%; box-shadow: 0 0 0 2px var(--hr-tile); }
  .pill { display: inline-flex; align-items: center; gap: 6px; height: 24px; padding: 0 10px; border-radius: 12px; font-size: 12px; font-weight: 600; white-space: nowrap; }
  .dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 36px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--divider-color); background: transparent; color: var(--primary-text-color); font-family: inherit; font-weight: 600; font-size: 13px; cursor: pointer; }
  .btn:hover { background: color-mix(in srgb, var(--primary-text-color) 6%, transparent); }
  .btn.sm { min-height: 32px; }
  .btn.red { border-color: var(--hr-red); color: var(--hr-red); }
  .btn.primary { border-color: var(--primary-color); color: var(--primary-color); }
  .btn[disabled] { opacity: .5; cursor: default; }
  .rbtn { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--divider-color); background: color-mix(in srgb, var(--card-background-color) 70%, transparent); color: var(--primary-text-color); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; flex: none; }
  .rbtn.plain { border: 0; background: transparent; }
  .rbtn ha-icon { --mdc-icon-size: 18px; }
  .banner { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; padding: 16px; border-radius: 14px; background: var(--hr-red-bg); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--hr-red) 35%, transparent); }
  .note { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; padding: 10px 14px; border-radius: 12px; background: color-mix(in srgb, var(--primary-color) 14%, transparent); font-size: 13px; }
  .note.red { background: var(--hr-red-bg); color: var(--hr-red); }
  .note ha-icon { --mdc-icon-size: 16px; }
  .chips { display: flex; gap: 8px; flex-wrap: wrap; }
  .chip { height: 32px; border: 0; border-radius: 16px; padding: 0 12px; cursor: pointer; font-family: inherit; font-weight: 600; font-size: 13px; background: var(--card-background-color); color: var(--primary-text-color); box-shadow: inset 0 0 0 1px var(--divider-color); }
  .chip.on { background: var(--primary-color); color: var(--text-primary-color, #fff); box-shadow: none; }
  .sw { position: relative; display: inline-block; width: 40px; height: 24px; flex: none; }
  .sw input { position: absolute; inset: 0; opacity: 0; margin: 0; cursor: pointer; }
  .sw span { position: absolute; inset: 0; border-radius: 12px; background: var(--divider-color); pointer-events: none; }
  .sw span::after { content: ''; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.2); }
  .sw input:checked + span { background: var(--primary-color); }
  .sw input:checked + span::after { left: 19px; }
  .field { display: flex; flex-direction: column; gap: 6px; font-size: 12px; font-weight: 600; color: var(--secondary-text-color); }
  textarea, select, .cell { font-size: 13px; line-height: 20px; font-family: var(--code-font-family, ui-monospace, SFMono-Regular, Menlo, monospace); color: var(--primary-text-color); background: var(--card-background-color); border: 1px solid var(--divider-color); border-radius: 10px; padding: 8px 10px; box-sizing: border-box; }
  select, .cell { font-family: inherit; height: 38px; padding: 0 10px; }
  .cell.name { font-weight: 700; }
  textarea { min-height: 320px; resize: vertical; width: 100%; tab-size: 2; }
  textarea.file { min-height: calc(100vh - 260px); }
  .scroll { overflow-x: auto; }
  table { border-collapse: collapse; width: 100%; min-width: 820px; }
  th { text-align: left; font-size: 12px; font-weight: 700; color: var(--secondary-text-color); padding: 10px 12px; border-bottom: 1px solid var(--divider-color); white-space: nowrap; }
  td { padding: 10px 12px; border-bottom: 1px solid var(--divider-color); vertical-align: top; }
  td .cell { width: 100%; min-width: 150px; }
  .when { font-size: 12px; color: var(--secondary-text-color); width: 44px; white-space: nowrap; font-variant-numeric: tabular-nums; }
  ul { list-style: none; margin: 0; padding: 0; }
  li { display: flex; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--divider-color); }
  .link { background: none; border: 0; color: var(--primary-color); font-family: inherit; font-weight: 600; font-size: 13px; padding: 12px 0; cursor: pointer; }
  .ringlabel { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; }
  .srow { display: flex; gap: 16px; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--divider-color); flex-wrap: wrap; }
  .srcbar { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; padding: 12px 14px; border-radius: 12px; background: var(--hr-tile); }
  .prow { display: flex; gap: 10px; align-items: center; padding: 8px 0; cursor: pointer; }
  .empty { padding: 24px; color: var(--secondary-text-color); }
  .scrim { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: flex-start; justify-content: center; padding-top: 10vh; z-index: 10; }
  .dlg { width: min(760px, 92vw); padding: 20px; display: flex; flex-direction: column; gap: 12px; box-shadow: 0 0 0 2px #F59E0B, 0 10px 30px rgba(0,0,0,.2); }
  .diff { padding: 10px 12px; border-radius: 10px; font-size: 12px; }
  .diff.a { background: color-mix(in srgb, #F59E0B 18%, transparent); }
  .diff.b { background: color-mix(in srgb, var(--primary-color) 16%, transparent); }
  .diff pre { margin: 6px 0 0; white-space: pre-wrap; font: 12px/18px var(--code-font-family, ui-monospace, monospace); }
  code { font-size: 13px; }
`;

if (!customElements.get('house-rules-panel')) customElements.define('house-rules-panel', HouseRulesPanel);
