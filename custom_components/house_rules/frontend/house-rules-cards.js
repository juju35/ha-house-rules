// House Rules cards, loaded on every dashboard:
//   custom:house-rules-card        overview, full (illustrated header, alert banner, one tile per rule type)
//   custom:house-rules-mini-card   the same, folded to its header; the corner button unfolds it (click outside folds)
//   custom:house-rules-timers-card running auto-off timers: rings, +15 min, turn off
//   custom:house-rules-activity-card the journal, filterable
// One WebSocket subscription (house_rules/subscribe) is shared by every card of the page.

const HR_VERSION = '1.2.1';

const HR_STRINGS = {
  "en": {
    "title": "House Rules",
    "timers_title": "Timers",
    "activity_title": "Activity",
    "alerts_one": "1 alert",
    "alerts_other": "{n} alerts",
    "timers_one": "1 timer",
    "timers_other": "{n} timers",
    "all_good": "All good",
    "rules_one": "1 rule",
    "rules_other": "{n} rules",
    "acknowledge": "Acknowledge",
    "extend": "+15 min",
    "turn_off": "Turn off",
    "no_timer": "No timer running",
    "no_activity": "Nothing yet",
    "not_loaded": "House Rules is not loaded",
    "expand": "Show details",
    "collapse": "Fold",
    "open_panel": "Open the panel",
    "all": "All",
    "alerts": "Alerts",
    "plugs": "Plugs",
    "lights": "Lights",
    "vacuum": "Vacuum",
    "appliances": "Appliances",
    "failures": "Failures",
    "left": "{t} left",
    "state.disabled": "Disabled",
    "state.snoozed": "Snoozed",
    "state.idle": "Idle",
    "state.armed": "Armed",
    "state.active": "Active",
    "state.alert": "Alert",
    "state.waiting": "Waiting",
    "state.failed": "Failed",
    "type.keep_on": "Keep on",
    "type.auto_off": "Timed off",
    "type.sensor_flash": "Light alert",
    "type.sensor_chime": "Chime",
    "type.appliance_resume": "Appliance resume",
    "type.cycle_done": "End of cycle",
    "type.vacuum_follow": "Vacuum lights",
    "type.vacuum_guard": "Vacuum guard",
    "type.presence_light": "Presence light",
    "type.lock_guard": "Lock guard",
    "type.leak_guard": "Leak guard",
    "result.ok": "OK",
    "result.skipped": "Skipped",
    "result.active": "Active",
    "result.failed": "Failed"
  },
  "fr": {
    "title": "House Rules",
    "timers_title": "Minuteurs",
    "activity_title": "Journal",
    "alerts_one": "1 alerte",
    "alerts_other": "{n} alertes",
    "timers_one": "1 minuteur",
    "timers_other": "{n} minuteurs",
    "all_good": "Tout va bien",
    "rules_one": "1 règle",
    "rules_other": "{n} règles",
    "acknowledge": "Acquitter",
    "extend": "+15 min",
    "turn_off": "Éteindre",
    "no_timer": "Aucun minuteur en cours",
    "no_activity": "Rien pour le moment",
    "not_loaded": "House Rules n'est pas chargé",
    "expand": "Afficher le détail",
    "collapse": "Replier",
    "open_panel": "Ouvrir le panneau",
    "all": "Tout",
    "alerts": "Alertes",
    "plugs": "Prises",
    "lights": "Lumières",
    "vacuum": "Aspirateur",
    "appliances": "Électroménager",
    "failures": "Échecs",
    "left": "encore {t}",
    "state.disabled": "Désactivée",
    "state.snoozed": "En pause",
    "state.idle": "Au repos",
    "state.armed": "Armée",
    "state.active": "Active",
    "state.alert": "Alerte",
    "state.waiting": "En attente",
    "state.failed": "Échec",
    "type.keep_on": "Rallumage",
    "type.auto_off": "Extinction temporisée",
    "type.sensor_flash": "Signal lumineux",
    "type.sensor_chime": "Sonnerie",
    "type.appliance_resume": "Relance électroménager",
    "type.cycle_done": "Fin de cycle",
    "type.vacuum_follow": "Lumières aspirateur",
    "type.vacuum_guard": "Retour base",
    "type.presence_light": "Lumière sur présence",
    "type.lock_guard": "Serrure",
    "type.leak_guard": "Fuite d'eau",
    "result.ok": "OK",
    "result.skipped": "Ignoré",
    "result.active": "En cours",
    "result.failed": "Échec"
  },
  "de": {
    "title": "House Rules",
    "timers_title": "Timer",
    "activity_title": "Aktivität",
    "alerts_one": "1 Alarm",
    "alerts_other": "{n} Alarme",
    "timers_one": "1 Timer",
    "timers_other": "{n} Timer",
    "all_good": "Alles in Ordnung",
    "rules_one": "1 Regel",
    "rules_other": "{n} Regeln",
    "acknowledge": "Bestätigen",
    "extend": "+15 min",
    "turn_off": "Ausschalten",
    "no_timer": "Kein Timer aktiv",
    "no_activity": "Noch nichts",
    "not_loaded": "House Rules ist nicht geladen",
    "expand": "Details anzeigen",
    "collapse": "Einklappen",
    "open_panel": "Panel öffnen",
    "all": "Alle",
    "alerts": "Alarme",
    "plugs": "Steckdosen",
    "lights": "Lichter",
    "vacuum": "Saugroboter",
    "appliances": "Haushaltsgeräte",
    "failures": "Fehler",
    "left": "noch {t}",
    "state.disabled": "Deaktiviert",
    "state.snoozed": "Pausiert",
    "state.idle": "Ruhend",
    "state.armed": "Scharf",
    "state.active": "Aktiv",
    "state.alert": "Alarm",
    "state.waiting": "Wartet",
    "state.failed": "Fehlgeschlagen",
    "type.keep_on": "Eingeschaltet halten",
    "type.auto_off": "Zeitgesteuert aus",
    "type.sensor_flash": "Lichtalarm",
    "type.sensor_chime": "Klingelton",
    "type.appliance_resume": "Geräte-Neustart",
    "type.cycle_done": "Programmende",
    "type.vacuum_follow": "Saugroboter-Licht",
    "type.vacuum_guard": "Saugroboter-Schutz",
    "type.presence_light": "Licht bei Anwesenheit",
    "type.lock_guard": "Schloss und Alarm",
    "type.leak_guard": "Wasserleck",
    "result.ok": "OK",
    "result.skipped": "Übersprungen",
    "result.active": "Läuft",
    "result.failed": "Fehlgeschlagen"
  },
  "es": {
    "title": "House Rules",
    "timers_title": "Temporizadores",
    "activity_title": "Actividad",
    "alerts_one": "1 alerta",
    "alerts_other": "{n} alertas",
    "timers_one": "1 temporizador",
    "timers_other": "{n} temporizadores",
    "all_good": "Todo bien",
    "rules_one": "1 regla",
    "rules_other": "{n} reglas",
    "acknowledge": "Confirmar",
    "extend": "+15 min",
    "turn_off": "Apagar",
    "no_timer": "Ningún temporizador en marcha",
    "no_activity": "Nada por ahora",
    "not_loaded": "House Rules no está cargado",
    "expand": "Ver detalles",
    "collapse": "Plegar",
    "open_panel": "Abrir el panel",
    "all": "Todas",
    "alerts": "Alertas",
    "plugs": "Enchufes",
    "lights": "Luces",
    "vacuum": "Robot aspirador",
    "appliances": "Electrodomésticos",
    "failures": "Fallos",
    "left": "quedan {t}",
    "state.disabled": "Desactivada",
    "state.snoozed": "En pausa",
    "state.idle": "En reposo",
    "state.armed": "Armada",
    "state.active": "Activa",
    "state.alert": "Alerta",
    "state.waiting": "En espera",
    "state.failed": "Fallida",
    "type.keep_on": "Mantener encendido",
    "type.auto_off": "Apagado temporizado",
    "type.sensor_flash": "Alerta luminosa",
    "type.sensor_chime": "Timbre",
    "type.appliance_resume": "Reanudar electrodoméstico",
    "type.cycle_done": "Fin de ciclo",
    "type.vacuum_follow": "Luces del robot",
    "type.vacuum_guard": "Vuelta a la base",
    "type.presence_light": "Luz por presencia",
    "type.lock_guard": "Cerradura y alarma",
    "type.leak_guard": "Fuga de agua",
    "result.ok": "OK",
    "result.skipped": "Omitida",
    "result.active": "En curso",
    "result.failed": "Fallida"
  },
  "it": {
    "title": "House Rules",
    "timers_title": "Timer",
    "activity_title": "Attività",
    "alerts_one": "1 allarme",
    "alerts_other": "{n} allarmi",
    "timers_one": "1 timer",
    "timers_other": "{n} timer",
    "all_good": "Tutto ok",
    "rules_one": "1 regola",
    "rules_other": "{n} regole",
    "acknowledge": "Conferma",
    "extend": "+15 min",
    "turn_off": "Spegni",
    "no_timer": "Nessun timer in corso",
    "no_activity": "Ancora niente",
    "not_loaded": "House Rules non è caricato",
    "expand": "Mostra dettagli",
    "collapse": "Riduci",
    "open_panel": "Apri il pannello",
    "all": "Tutte",
    "alerts": "Allarmi",
    "plugs": "Prese",
    "lights": "Luci",
    "vacuum": "Robot aspirapolvere",
    "appliances": "Elettrodomestici",
    "failures": "Errori",
    "left": "ancora {t}",
    "state.disabled": "Disattivata",
    "state.snoozed": "In pausa",
    "state.idle": "A riposo",
    "state.armed": "Armata",
    "state.active": "Attiva",
    "state.alert": "Allarme",
    "state.waiting": "In attesa",
    "state.failed": "Non riuscita",
    "type.keep_on": "Mantieni acceso",
    "type.auto_off": "Spegnimento a tempo",
    "type.sensor_flash": "Allarme luminoso",
    "type.sensor_chime": "Suoneria",
    "type.appliance_resume": "Ripresa elettrodomestico",
    "type.cycle_done": "Fine ciclo",
    "type.vacuum_follow": "Luci del robot",
    "type.vacuum_guard": "Ritorno alla base",
    "type.presence_light": "Luce su presenza",
    "type.lock_guard": "Serratura e allarme",
    "type.leak_guard": "Perdita d'acqua",
    "result.ok": "OK",
    "result.skipped": "Saltata",
    "result.active": "In corso",
    "result.failed": "Non riuscita"
  },
  "nl": {
    "title": "House Rules",
    "timers_title": "Timers",
    "activity_title": "Activiteit",
    "alerts_one": "1 alarm",
    "alerts_other": "{n} alarmen",
    "timers_one": "1 timer",
    "timers_other": "{n} timers",
    "all_good": "Alles in orde",
    "rules_one": "1 regel",
    "rules_other": "{n} regels",
    "acknowledge": "Bevestigen",
    "extend": "+15 min",
    "turn_off": "Uitzetten",
    "no_timer": "Geen timer actief",
    "no_activity": "Nog niets",
    "not_loaded": "House Rules is niet geladen",
    "expand": "Details tonen",
    "collapse": "Inklappen",
    "open_panel": "Paneel openen",
    "all": "Alle",
    "alerts": "Alarmen",
    "plugs": "Stekkers",
    "lights": "Lampen",
    "vacuum": "Robotstofzuiger",
    "appliances": "Huishoudapparaten",
    "failures": "Fouten",
    "left": "nog {t}",
    "state.disabled": "Uitgeschakeld",
    "state.snoozed": "Gepauzeerd",
    "state.idle": "In rust",
    "state.armed": "Actief gesteld",
    "state.active": "Actief",
    "state.alert": "Alarm",
    "state.waiting": "Wachtend",
    "state.failed": "Mislukt",
    "type.keep_on": "Aan houden",
    "type.auto_off": "Getimed uit",
    "type.sensor_flash": "Lichtalarm",
    "type.sensor_chime": "Belgeluid",
    "type.appliance_resume": "Apparaat hervatten",
    "type.cycle_done": "Einde cyclus",
    "type.vacuum_follow": "Robotlampen",
    "type.vacuum_guard": "Terug naar basis",
    "type.presence_light": "Licht bij aanwezigheid",
    "type.lock_guard": "Slot en alarm",
    "type.leak_guard": "Waterlek",
    "result.ok": "OK",
    "result.skipped": "Overgeslagen",
    "result.active": "Bezig",
    "result.failed": "Mislukt"
  },
  "pt": {
    "title": "House Rules",
    "timers_title": "Temporizadores",
    "activity_title": "Atividade",
    "alerts_one": "1 alerta",
    "alerts_other": "{n} alertas",
    "timers_one": "1 temporizador",
    "timers_other": "{n} temporizadores",
    "all_good": "Tudo bem",
    "rules_one": "1 regra",
    "rules_other": "{n} regras",
    "acknowledge": "Confirmar",
    "extend": "+15 min",
    "turn_off": "Desligar",
    "no_timer": "Nenhum temporizador ativo",
    "no_activity": "Nada por agora",
    "not_loaded": "House Rules não está carregado",
    "expand": "Ver detalhes",
    "collapse": "Recolher",
    "open_panel": "Abrir o painel",
    "all": "Todas",
    "alerts": "Alertas",
    "plugs": "Tomadas",
    "lights": "Luzes",
    "vacuum": "Robô aspirador",
    "appliances": "Eletrodomésticos",
    "failures": "Falhas",
    "left": "faltam {t}",
    "state.disabled": "Desativada",
    "state.snoozed": "Em pausa",
    "state.idle": "Em repouso",
    "state.armed": "Armada",
    "state.active": "Ativa",
    "state.alert": "Alerta",
    "state.waiting": "Em espera",
    "state.failed": "Falhou",
    "type.keep_on": "Manter ligado",
    "type.auto_off": "Desligar temporizado",
    "type.sensor_flash": "Alerta luminoso",
    "type.sensor_chime": "Toque",
    "type.appliance_resume": "Retomar eletrodoméstico",
    "type.cycle_done": "Fim de ciclo",
    "type.vacuum_follow": "Luzes do robô",
    "type.vacuum_guard": "Regresso à base",
    "type.presence_light": "Luz por presença",
    "type.lock_guard": "Fechadura e alarme",
    "type.leak_guard": "Fuga de água",
    "result.ok": "OK",
    "result.skipped": "Ignorada",
    "result.active": "Em curso",
    "result.failed": "Falhou"
  },
  "pl": {
    "title": "House Rules",
    "timers_title": "Minutniki",
    "activity_title": "Aktywność",
    "alerts_one": "1 alarm",
    "alerts_other": "Alarmy: {n}",
    "timers_one": "1 minutnik",
    "timers_other": "Minutniki: {n}",
    "all_good": "Wszystko w porządku",
    "rules_one": "1 reguła",
    "rules_other": "Reguły: {n}",
    "acknowledge": "Potwierdź",
    "extend": "+15 min",
    "turn_off": "Wyłącz",
    "no_timer": "Brak aktywnych minutników",
    "no_activity": "Jeszcze nic",
    "not_loaded": "House Rules nie jest załadowane",
    "expand": "Pokaż szczegóły",
    "collapse": "Zwiń",
    "open_panel": "Otwórz panel",
    "all": "Wszystkie",
    "alerts": "Alarmy",
    "plugs": "Gniazdka",
    "lights": "Światła",
    "vacuum": "Robot sprzątający",
    "appliances": "Sprzęt AGD",
    "failures": "Błędy",
    "left": "zostało {t}",
    "state.disabled": "Wyłączona",
    "state.snoozed": "Wstrzymana",
    "state.idle": "Bezczynna",
    "state.armed": "Uzbrojona",
    "state.active": "Aktywna",
    "state.alert": "Alarm",
    "state.waiting": "Oczekuje",
    "state.failed": "Niepowodzenie",
    "type.keep_on": "Utrzymuj włączone",
    "type.auto_off": "Wyłączanie po czasie",
    "type.sensor_flash": "Alarm świetlny",
    "type.sensor_chime": "Dzwonek",
    "type.appliance_resume": "Wznawianie urządzenia",
    "type.cycle_done": "Koniec cyklu",
    "type.vacuum_follow": "Światła robota",
    "type.vacuum_guard": "Powrót do bazy",
    "type.presence_light": "Światło przy obecności",
    "type.lock_guard": "Zamek i alarm",
    "type.leak_guard": "Wyciek wody",
    "result.ok": "OK",
    "result.skipped": "Pominięto",
    "result.active": "W toku",
    "result.failed": "Niepowodzenie"
  },
  "sr": {
    "title": "House Rules",
    "timers_title": "Тајмери",
    "activity_title": "Активност",
    "alerts_one": "1 узбуна",
    "alerts_other": "Узбуне: {n}",
    "timers_one": "1 тајмер",
    "timers_other": "Тајмери: {n}",
    "all_good": "Све је у реду",
    "rules_one": "1 правило",
    "rules_other": "Правила: {n}",
    "acknowledge": "Потврди",
    "extend": "+15 min",
    "turn_off": "Искључи",
    "no_timer": "Нема активних тајмера",
    "no_activity": "Још ништа",
    "not_loaded": "House Rules није учитан",
    "expand": "Прикажи детаље",
    "collapse": "Скупи",
    "open_panel": "Отвори панел",
    "all": "Све",
    "alerts": "Узбуне",
    "plugs": "Утичнице",
    "lights": "Светла",
    "vacuum": "Робот усисивач",
    "appliances": "Кућни апарати",
    "failures": "Неуспеси",
    "left": "још {t}",
    "state.disabled": "Искључено",
    "state.snoozed": "Паузирано",
    "state.idle": "Мирује",
    "state.armed": "Активирано",
    "state.active": "Активно",
    "state.alert": "Узбуна",
    "state.waiting": "Чека",
    "state.failed": "Неуспех",
    "type.keep_on": "Држи укључено",
    "type.auto_off": "Искључење тајмером",
    "type.sensor_flash": "Светлосна узбуна",
    "type.sensor_chime": "Звоно",
    "type.appliance_resume": "Наставак уређаја",
    "type.cycle_done": "Крај циклуса",
    "type.vacuum_follow": "Светла за робота",
    "type.vacuum_guard": "Повратак на базу",
    "type.presence_light": "Светло на присуство",
    "type.lock_guard": "Брава и аларм",
    "type.leak_guard": "Цурење воде",
    "result.ok": "OK",
    "result.skipped": "Прескочено",
    "result.active": "У току",
    "result.failed": "Неуспех"
  },
  "ro": {
    "title": "House Rules",
    "timers_title": "Cronometre",
    "activity_title": "Activitate",
    "alerts_one": "1 alertă",
    "alerts_other": "Alerte: {n}",
    "timers_one": "1 cronometru",
    "timers_other": "Cronometre: {n}",
    "all_good": "Totul e în regulă",
    "rules_one": "1 regulă",
    "rules_other": "Reguli: {n}",
    "acknowledge": "Confirmă",
    "extend": "+15 min",
    "turn_off": "Oprește",
    "no_timer": "Niciun cronometru activ",
    "no_activity": "Nimic deocamdată",
    "not_loaded": "House Rules nu este încărcat",
    "expand": "Afișează detalii",
    "collapse": "Restrânge",
    "open_panel": "Deschide panoul",
    "all": "Toate",
    "alerts": "Alerte",
    "plugs": "Prize",
    "lights": "Lumini",
    "vacuum": "Robot aspirator",
    "appliances": "Electrocasnice",
    "failures": "Eșecuri",
    "left": "mai sunt {t}",
    "state.disabled": "Dezactivată",
    "state.snoozed": "În pauză",
    "state.idle": "Inactivă",
    "state.armed": "Armată",
    "state.active": "Activă",
    "state.alert": "Alertă",
    "state.waiting": "În așteptare",
    "state.failed": "Eșuată",
    "type.keep_on": "Menține pornit",
    "type.auto_off": "Oprire temporizată",
    "type.sensor_flash": "Alertă luminoasă",
    "type.sensor_chime": "Sonerie",
    "type.appliance_resume": "Reluare electrocasnic",
    "type.cycle_done": "Sfârșit de ciclu",
    "type.vacuum_follow": "Luminile robotului",
    "type.vacuum_guard": "Întoarcere la bază",
    "type.presence_light": "Lumină la prezență",
    "type.lock_guard": "Încuietoare și alarmă",
    "type.leak_guard": "Scurgere de apă",
    "result.ok": "OK",
    "result.skipped": "Omisă",
    "result.active": "În curs",
    "result.failed": "Eșuată"
  },
  "da": {
    "title": "House Rules",
    "timers_title": "Timere",
    "activity_title": "Aktivitet",
    "alerts_one": "1 alarm",
    "alerts_other": "{n} alarmer",
    "timers_one": "1 timer",
    "timers_other": "{n} timere",
    "all_good": "Alt er i orden",
    "rules_one": "1 regel",
    "rules_other": "{n} regler",
    "acknowledge": "Kvittér",
    "extend": "+15 min",
    "turn_off": "Sluk",
    "no_timer": "Ingen timer kører",
    "no_activity": "Intet endnu",
    "not_loaded": "House Rules er ikke indlæst",
    "expand": "Vis detaljer",
    "collapse": "Fold sammen",
    "open_panel": "Åbn panelet",
    "all": "Alle",
    "alerts": "Alarmer",
    "plugs": "Stik",
    "lights": "Lys",
    "vacuum": "Robotstøvsuger",
    "appliances": "Husholdningsapparater",
    "failures": "Fejl",
    "left": "{t} tilbage",
    "state.disabled": "Deaktiveret",
    "state.snoozed": "På pause",
    "state.idle": "Inaktiv",
    "state.armed": "Tilkoblet",
    "state.active": "Aktiv",
    "state.alert": "Alarm",
    "state.waiting": "Venter",
    "state.failed": "Mislykket",
    "type.keep_on": "Hold tændt",
    "type.auto_off": "Tidsstyret sluk",
    "type.sensor_flash": "Lysalarm",
    "type.sensor_chime": "Ringelyd",
    "type.appliance_resume": "Genstart apparat",
    "type.cycle_done": "Program færdigt",
    "type.vacuum_follow": "Robotlys",
    "type.vacuum_guard": "Tilbage til base",
    "type.presence_light": "Lys ved tilstedeværelse",
    "type.lock_guard": "Lås og alarm",
    "type.leak_guard": "Vandlæk",
    "result.ok": "OK",
    "result.skipped": "Sprunget over",
    "result.active": "I gang",
    "result.failed": "Mislykket"
  },
  "sv": {
    "title": "House Rules",
    "timers_title": "Timers",
    "activity_title": "Aktivitet",
    "alerts_one": "1 larm",
    "alerts_other": "{n} larm",
    "timers_one": "1 timer",
    "timers_other": "{n} timers",
    "all_good": "Allt är bra",
    "rules_one": "1 regel",
    "rules_other": "{n} regler",
    "acknowledge": "Kvittera",
    "extend": "+15 min",
    "turn_off": "Stäng av",
    "no_timer": "Ingen timer igång",
    "no_activity": "Inget ännu",
    "not_loaded": "House Rules är inte laddat",
    "expand": "Visa detaljer",
    "collapse": "Fäll ihop",
    "open_panel": "Öppna panelen",
    "all": "Alla",
    "alerts": "Larm",
    "plugs": "Uttag",
    "lights": "Lampor",
    "vacuum": "Robotdammsugare",
    "appliances": "Hushållsapparater",
    "failures": "Fel",
    "left": "{t} kvar",
    "state.disabled": "Inaktiverad",
    "state.snoozed": "Pausad",
    "state.idle": "Vilande",
    "state.armed": "Aktiverad",
    "state.active": "Aktiv",
    "state.alert": "Larm",
    "state.waiting": "Väntar",
    "state.failed": "Misslyckad",
    "type.keep_on": "Håll påslagen",
    "type.auto_off": "Tidsstyrd avstängning",
    "type.sensor_flash": "Ljuslarm",
    "type.sensor_chime": "Ringsignal",
    "type.appliance_resume": "Återuppta apparat",
    "type.cycle_done": "Programslut",
    "type.vacuum_follow": "Robotlampor",
    "type.vacuum_guard": "Tillbaka till basen",
    "type.presence_light": "Ljus vid närvaro",
    "type.lock_guard": "Lås och larm",
    "type.leak_guard": "Vattenläcka",
    "result.ok": "OK",
    "result.skipped": "Hoppades över",
    "result.active": "Pågår",
    "result.failed": "Misslyckad"
  },
  "bg": {
    "title": "House Rules",
    "timers_title": "Таймери",
    "activity_title": "Активност",
    "alerts_one": "1 тревога",
    "alerts_other": "Тревоги: {n}",
    "timers_one": "1 таймер",
    "timers_other": "Таймери: {n}",
    "all_good": "Всичко е наред",
    "rules_one": "1 правило",
    "rules_other": "Правила: {n}",
    "acknowledge": "Потвърди",
    "extend": "+15 min",
    "turn_off": "Изключи",
    "no_timer": "Няма активни таймери",
    "no_activity": "Все още нищо",
    "not_loaded": "House Rules не е заредено",
    "expand": "Покажи подробности",
    "collapse": "Свий",
    "open_panel": "Отвори панела",
    "all": "Всички",
    "alerts": "Тревоги",
    "plugs": "Контакти",
    "lights": "Осветление",
    "vacuum": "Робот прахосмукачка",
    "appliances": "Домакински уреди",
    "failures": "Неуспехи",
    "left": "остават {t}",
    "state.disabled": "Изключено",
    "state.snoozed": "Спряно временно",
    "state.idle": "В покой",
    "state.armed": "Активирано",
    "state.active": "Активно",
    "state.alert": "Тревога",
    "state.waiting": "Изчаква",
    "state.failed": "Неуспех",
    "type.keep_on": "Дръж включено",
    "type.auto_off": "Изключване с таймер",
    "type.sensor_flash": "Светлинна тревога",
    "type.sensor_chime": "Звънец",
    "type.appliance_resume": "Възобновяване на уред",
    "type.cycle_done": "Край на цикъла",
    "type.vacuum_follow": "Светлини за робота",
    "type.vacuum_guard": "Връщане в базата",
    "type.presence_light": "Светлина при присъствие",
    "type.lock_guard": "Брава и аларма",
    "type.leak_guard": "Теч на вода",
    "result.ok": "OK",
    "result.skipped": "Пропуснато",
    "result.active": "В ход",
    "result.failed": "Неуспех"
  },
  "ru": {
    "title": "House Rules",
    "timers_title": "Таймеры",
    "activity_title": "Активность",
    "alerts_one": "1 тревога",
    "alerts_other": "Тревоги: {n}",
    "timers_one": "1 таймер",
    "timers_other": "Таймеры: {n}",
    "all_good": "Всё в порядке",
    "rules_one": "1 правило",
    "rules_other": "Правила: {n}",
    "acknowledge": "Подтвердить",
    "extend": "+15 min",
    "turn_off": "Выключить",
    "no_timer": "Нет запущенных таймеров",
    "no_activity": "Пока ничего",
    "not_loaded": "House Rules не загружено",
    "expand": "Показать подробности",
    "collapse": "Свернуть",
    "open_panel": "Открыть панель",
    "all": "Все",
    "alerts": "Тревоги",
    "plugs": "Розетки",
    "lights": "Свет",
    "vacuum": "Робот-пылесос",
    "appliances": "Бытовая техника",
    "failures": "Сбои",
    "left": "осталось {t}",
    "state.disabled": "Отключено",
    "state.snoozed": "Приостановлено",
    "state.idle": "Ожидание",
    "state.armed": "Взведено",
    "state.active": "Активно",
    "state.alert": "Тревога",
    "state.waiting": "Ждёт",
    "state.failed": "Сбой",
    "type.keep_on": "Держать включённым",
    "type.auto_off": "Выключение по таймеру",
    "type.sensor_flash": "Световая тревога",
    "type.sensor_chime": "Звонок",
    "type.appliance_resume": "Возобновление прибора",
    "type.cycle_done": "Конец цикла",
    "type.vacuum_follow": "Свет за роботом",
    "type.vacuum_guard": "Возврат на базу",
    "type.presence_light": "Свет по присутствию",
    "type.lock_guard": "Замок и сигнализация",
    "type.leak_guard": "Протечка воды",
    "result.ok": "OK",
    "result.skipped": "Пропущено",
    "result.active": "Выполняется",
    "result.failed": "Сбой"
  },
  "uk": {
    "title": "House Rules",
    "timers_title": "Таймери",
    "activity_title": "Активність",
    "alerts_one": "1 тривога",
    "alerts_other": "Тривоги: {n}",
    "timers_one": "1 таймер",
    "timers_other": "Таймери: {n}",
    "all_good": "Усе гаразд",
    "rules_one": "1 правило",
    "rules_other": "Правила: {n}",
    "acknowledge": "Підтвердити",
    "extend": "+15 min",
    "turn_off": "Вимкнути",
    "no_timer": "Немає запущених таймерів",
    "no_activity": "Поки нічого",
    "not_loaded": "House Rules не завантажено",
    "expand": "Показати деталі",
    "collapse": "Згорнути",
    "open_panel": "Відкрити панель",
    "all": "Усі",
    "alerts": "Тривоги",
    "plugs": "Розетки",
    "lights": "Світло",
    "vacuum": "Робот-пилосос",
    "appliances": "Побутова техніка",
    "failures": "Збої",
    "left": "залишилось {t}",
    "state.disabled": "Вимкнено",
    "state.snoozed": "Призупинено",
    "state.idle": "Очікування",
    "state.armed": "Зведено",
    "state.active": "Активно",
    "state.alert": "Тривога",
    "state.waiting": "Чекає",
    "state.failed": "Збій",
    "type.keep_on": "Тримати увімкненим",
    "type.auto_off": "Вимкнення за таймером",
    "type.sensor_flash": "Світлова тривога",
    "type.sensor_chime": "Дзвінок",
    "type.appliance_resume": "Відновлення приладу",
    "type.cycle_done": "Кінець циклу",
    "type.vacuum_follow": "Світло за роботом",
    "type.vacuum_guard": "Повернення на базу",
    "type.presence_light": "Світло за присутністю",
    "type.lock_guard": "Замок і сигналізація",
    "type.leak_guard": "Протікання води",
    "result.ok": "OK",
    "result.skipped": "Пропущено",
    "result.active": "Виконується",
    "result.failed": "Збій"
  },
  "hu": {
    "title": "House Rules",
    "timers_title": "Időzítők",
    "activity_title": "Tevékenység",
    "alerts_one": "1 riasztás",
    "alerts_other": "{n} riasztás",
    "timers_one": "1 időzítő",
    "timers_other": "{n} időzítő",
    "all_good": "Minden rendben",
    "rules_one": "1 szabály",
    "rules_other": "{n} szabály",
    "acknowledge": "Nyugtázás",
    "extend": "+15 min",
    "turn_off": "Kikapcsolás",
    "no_timer": "Nincs futó időzítő",
    "no_activity": "Még semmi",
    "not_loaded": "A House Rules nincs betöltve",
    "expand": "Részletek",
    "collapse": "Összecsukás",
    "open_panel": "Panel megnyitása",
    "all": "Mind",
    "alerts": "Riasztások",
    "plugs": "Konnektorok",
    "lights": "Lámpák",
    "vacuum": "Robotporszívó",
    "appliances": "Háztartási gépek",
    "failures": "Hibák",
    "left": "még {t}",
    "state.disabled": "Letiltva",
    "state.snoozed": "Szüneteltetve",
    "state.idle": "Tétlen",
    "state.armed": "Élesítve",
    "state.active": "Aktív",
    "state.alert": "Riasztás",
    "state.waiting": "Várakozik",
    "state.failed": "Sikertelen",
    "type.keep_on": "Bekapcsolva tartás",
    "type.auto_off": "Időzített kikapcsolás",
    "type.sensor_flash": "Fényriasztás",
    "type.sensor_chime": "Csengőhang",
    "type.appliance_resume": "Készülék folytatása",
    "type.cycle_done": "Program vége",
    "type.vacuum_follow": "Robot lámpái",
    "type.vacuum_guard": "Vissza a bázisra",
    "type.presence_light": "Jelenlét-világítás",
    "type.lock_guard": "Zár és riasztó",
    "type.leak_guard": "Vízszivárgás",
    "result.ok": "OK",
    "result.skipped": "Kihagyva",
    "result.active": "Folyamatban",
    "result.failed": "Sikertelen"
  },
  "sk": {
    "title": "House Rules",
    "timers_title": "Časovače",
    "activity_title": "Aktivita",
    "alerts_one": "1 poplach",
    "alerts_other": "Poplachy: {n}",
    "timers_one": "1 časovač",
    "timers_other": "Časovače: {n}",
    "all_good": "Všetko v poriadku",
    "rules_one": "1 pravidlo",
    "rules_other": "Pravidlá: {n}",
    "acknowledge": "Potvrdiť",
    "extend": "+15 min",
    "turn_off": "Vypnúť",
    "no_timer": "Žiadny bežiaci časovač",
    "no_activity": "Zatiaľ nič",
    "not_loaded": "House Rules nie je načítané",
    "expand": "Zobraziť podrobnosti",
    "collapse": "Zbaliť",
    "open_panel": "Otvoriť panel",
    "all": "Všetko",
    "alerts": "Poplachy",
    "plugs": "Zásuvky",
    "lights": "Svetlá",
    "vacuum": "Robotický vysávač",
    "appliances": "Spotrebiče",
    "failures": "Chyby",
    "left": "zostáva {t}",
    "state.disabled": "Vypnuté",
    "state.snoozed": "Pozastavené",
    "state.idle": "V pokoji",
    "state.armed": "Aktivované",
    "state.active": "Aktívne",
    "state.alert": "Poplach",
    "state.waiting": "Čaká",
    "state.failed": "Zlyhalo",
    "type.keep_on": "Udržať zapnuté",
    "type.auto_off": "Časované vypnutie",
    "type.sensor_flash": "Svetelný poplach",
    "type.sensor_chime": "Zvonenie",
    "type.appliance_resume": "Obnovenie spotrebiča",
    "type.cycle_done": "Koniec cyklu",
    "type.vacuum_follow": "Svetlá robota",
    "type.vacuum_guard": "Návrat na základňu",
    "type.presence_light": "Svetlo pri prítomnosti",
    "type.lock_guard": "Zámok a alarm",
    "type.leak_guard": "Únik vody",
    "result.ok": "OK",
    "result.skipped": "Preskočené",
    "result.active": "Prebieha",
    "result.failed": "Zlyhalo"
  },
  "cs": {
    "title": "House Rules",
    "timers_title": "Časovače",
    "activity_title": "Aktivita",
    "alerts_one": "1 poplach",
    "alerts_other": "Poplachy: {n}",
    "timers_one": "1 časovač",
    "timers_other": "Časovače: {n}",
    "all_good": "Vše v pořádku",
    "rules_one": "1 pravidlo",
    "rules_other": "Pravidla: {n}",
    "acknowledge": "Potvrdit",
    "extend": "+15 min",
    "turn_off": "Vypnout",
    "no_timer": "Žádný běžící časovač",
    "no_activity": "Zatím nic",
    "not_loaded": "House Rules není načteno",
    "expand": "Zobrazit podrobnosti",
    "collapse": "Sbalit",
    "open_panel": "Otevřít panel",
    "all": "Vše",
    "alerts": "Poplachy",
    "plugs": "Zásuvky",
    "lights": "Světla",
    "vacuum": "Robotický vysavač",
    "appliances": "Spotřebiče",
    "failures": "Chyby",
    "left": "zbývá {t}",
    "state.disabled": "Vypnuto",
    "state.snoozed": "Pozastaveno",
    "state.idle": "V klidu",
    "state.armed": "Aktivováno",
    "state.active": "Aktivní",
    "state.alert": "Poplach",
    "state.waiting": "Čeká",
    "state.failed": "Selhalo",
    "type.keep_on": "Udržet zapnuté",
    "type.auto_off": "Časované vypnutí",
    "type.sensor_flash": "Světelný poplach",
    "type.sensor_chime": "Zvonění",
    "type.appliance_resume": "Obnovení spotřebiče",
    "type.cycle_done": "Konec cyklu",
    "type.vacuum_follow": "Světla robota",
    "type.vacuum_guard": "Návrat na základnu",
    "type.presence_light": "Světlo při přítomnosti",
    "type.lock_guard": "Zámek a alarm",
    "type.leak_guard": "Únik vody",
    "result.ok": "OK",
    "result.skipped": "Přeskočeno",
    "result.active": "Probíhá",
    "result.failed": "Selhalo"
  },
  "sl": {
    "title": "House Rules",
    "timers_title": "Časovniki",
    "activity_title": "Dejavnost",
    "alerts_one": "1 alarm",
    "alerts_other": "Alarmi: {n}",
    "timers_one": "1 časovnik",
    "timers_other": "Časovniki: {n}",
    "all_good": "Vse v redu",
    "rules_one": "1 pravilo",
    "rules_other": "Pravila: {n}",
    "acknowledge": "Potrdi",
    "extend": "+15 min",
    "turn_off": "Izklopi",
    "no_timer": "Noben časovnik ne teče",
    "no_activity": "Še nič",
    "not_loaded": "House Rules ni naložen",
    "expand": "Prikaži podrobnosti",
    "collapse": "Strni",
    "open_panel": "Odpri ploščo",
    "all": "Vse",
    "alerts": "Alarmi",
    "plugs": "Vtičnice",
    "lights": "Luči",
    "vacuum": "Robotski sesalnik",
    "appliances": "Gospodinjski aparati",
    "failures": "Napake",
    "left": "še {t}",
    "state.disabled": "Onemogočeno",
    "state.snoozed": "Začasno ustavljeno",
    "state.idle": "Mirovanje",
    "state.armed": "Vklopljeno",
    "state.active": "Aktivno",
    "state.alert": "Alarm",
    "state.waiting": "Čaka",
    "state.failed": "Ni uspelo",
    "type.keep_on": "Ohrani vklopljeno",
    "type.auto_off": "Časovni izklop",
    "type.sensor_flash": "Svetlobni alarm",
    "type.sensor_chime": "Zvonjenje",
    "type.appliance_resume": "Nadaljevanje naprave",
    "type.cycle_done": "Konec cikla",
    "type.vacuum_follow": "Luči robota",
    "type.vacuum_guard": "Vrnitev na bazo",
    "type.presence_light": "Luč ob prisotnosti",
    "type.lock_guard": "Ključavnica in alarm",
    "type.leak_guard": "Puščanje vode",
    "result.ok": "OK",
    "result.skipped": "Preskočeno",
    "result.active": "Poteka",
    "result.failed": "Ni uspelo"
  },
  "lv": {
    "title": "House Rules",
    "timers_title": "Taimeri",
    "activity_title": "Aktivitāte",
    "alerts_one": "1 trauksme",
    "alerts_other": "Trauksmes: {n}",
    "timers_one": "1 taimeris",
    "timers_other": "Taimeri: {n}",
    "all_good": "Viss kārtībā",
    "rules_one": "1 noteikums",
    "rules_other": "Noteikumi: {n}",
    "acknowledge": "Apstiprināt",
    "extend": "+15 min",
    "turn_off": "Izslēgt",
    "no_timer": "Neviens taimeris nedarbojas",
    "no_activity": "Pagaidām nekā",
    "not_loaded": "House Rules nav ielādēts",
    "expand": "Rādīt detaļas",
    "collapse": "Sakļaut",
    "open_panel": "Atvērt paneli",
    "all": "Visi",
    "alerts": "Trauksmes",
    "plugs": "Kontaktligzdas",
    "lights": "Gaismas",
    "vacuum": "Robotputekļsūcējs",
    "appliances": "Sadzīves tehnika",
    "failures": "Kļūdas",
    "left": "atlikušas {t}",
    "state.disabled": "Atspējots",
    "state.snoozed": "Apturēts",
    "state.idle": "Dīkstāvē",
    "state.armed": "Aktivizēts",
    "state.active": "Aktīvs",
    "state.alert": "Trauksme",
    "state.waiting": "Gaida",
    "state.failed": "Neizdevās",
    "type.keep_on": "Turēt ieslēgtu",
    "type.auto_off": "Izslēgšana ar taimeri",
    "type.sensor_flash": "Gaismas trauksme",
    "type.sensor_chime": "Zvans",
    "type.appliance_resume": "Ierīces atsākšana",
    "type.cycle_done": "Cikla beigas",
    "type.vacuum_follow": "Robota gaismas",
    "type.vacuum_guard": "Atgriešanās bāzē",
    "type.presence_light": "Gaisma klātbūtnē",
    "type.lock_guard": "Slēdzene un signalizācija",
    "type.leak_guard": "Ūdens noplūde",
    "result.ok": "OK",
    "result.skipped": "Izlaists",
    "result.active": "Notiek",
    "result.failed": "Neizdevās"
  },
  "el": {
    "title": "House Rules",
    "timers_title": "Χρονόμετρα",
    "activity_title": "Δραστηριότητα",
    "alerts_one": "1 συναγερμός",
    "alerts_other": "{n} συναγερμοί",
    "timers_one": "1 χρονόμετρο",
    "timers_other": "{n} χρονόμετρα",
    "all_good": "Όλα εντάξει",
    "rules_one": "1 κανόνας",
    "rules_other": "{n} κανόνες",
    "acknowledge": "Επιβεβαίωση",
    "extend": "+15 min",
    "turn_off": "Σβήσιμο",
    "no_timer": "Κανένα ενεργό χρονόμετρο",
    "no_activity": "Τίποτα ακόμη",
    "not_loaded": "Το House Rules δεν έχει φορτωθεί",
    "expand": "Εμφάνιση λεπτομερειών",
    "collapse": "Σύμπτυξη",
    "open_panel": "Άνοιγμα πίνακα",
    "all": "Όλα",
    "alerts": "Συναγερμοί",
    "plugs": "Πρίζες",
    "lights": "Φώτα",
    "vacuum": "Ρομπότ σκούπα",
    "appliances": "Οικιακές συσκευές",
    "failures": "Αποτυχίες",
    "left": "απομένουν {t}",
    "state.disabled": "Απενεργοποιημένο",
    "state.snoozed": "Σε παύση",
    "state.idle": "Αδρανές",
    "state.armed": "Οπλισμένο",
    "state.active": "Ενεργό",
    "state.alert": "Συναγερμός",
    "state.waiting": "Σε αναμονή",
    "state.failed": "Αποτυχία",
    "type.keep_on": "Διατήρηση αναμμένου",
    "type.auto_off": "Σβήσιμο με χρονόμετρο",
    "type.sensor_flash": "Φωτεινός συναγερμός",
    "type.sensor_chime": "Κουδούνι",
    "type.appliance_resume": "Επανεκκίνηση συσκευής",
    "type.cycle_done": "Τέλος κύκλου",
    "type.vacuum_follow": "Φώτα ρομπότ",
    "type.vacuum_guard": "Επιστροφή στη βάση",
    "type.presence_light": "Φως με παρουσία",
    "type.lock_guard": "Κλειδαριά και συναγερμός",
    "type.leak_guard": "Διαρροή νερού",
    "result.ok": "OK",
    "result.skipped": "Παραλείφθηκε",
    "result.active": "Σε εξέλιξη",
    "result.failed": "Αποτυχία"
  },
  "sr-Latn": {
    "title": "House Rules",
    "timers_title": "Tajmeri",
    "activity_title": "Aktivnost",
    "alerts_one": "1 uzbuna",
    "alerts_other": "Uzbune: {n}",
    "timers_one": "1 tajmer",
    "timers_other": "Tajmeri: {n}",
    "all_good": "Sve je u redu",
    "rules_one": "1 pravilo",
    "rules_other": "Pravila: {n}",
    "acknowledge": "Potvrdi",
    "extend": "+15 min",
    "turn_off": "Isključi",
    "no_timer": "Nema aktivnih tajmera",
    "no_activity": "Još ništa",
    "not_loaded": "House Rules nije učitan",
    "expand": "Prikaži detalje",
    "collapse": "Skupi",
    "open_panel": "Otvori panel",
    "all": "Sve",
    "alerts": "Uzbune",
    "plugs": "Utičnice",
    "lights": "Svetla",
    "vacuum": "Robot usisivač",
    "appliances": "Kućni aparati",
    "failures": "Neuspesi",
    "left": "još {t}",
    "state.disabled": "Isključeno",
    "state.snoozed": "Pauzirano",
    "state.idle": "Miruje",
    "state.armed": "Aktivirano",
    "state.active": "Aktivno",
    "state.alert": "Uzbuna",
    "state.waiting": "Čeka",
    "state.failed": "Neuspeh",
    "type.keep_on": "Drži uključeno",
    "type.auto_off": "Isključenje tajmerom",
    "type.sensor_flash": "Svetlosna uzbuna",
    "type.sensor_chime": "Zvono",
    "type.appliance_resume": "Nastavak uređaja",
    "type.cycle_done": "Kraj ciklusa",
    "type.vacuum_follow": "Svetla za robota",
    "type.vacuum_guard": "Povratak na bazu",
    "type.presence_light": "Svetlo na prisustvo",
    "type.lock_guard": "Brava i alarm",
    "type.leak_guard": "Curenje vode",
    "result.ok": "OK",
    "result.skipped": "Preskočeno",
    "result.active": "U toku",
    "result.failed": "Neuspeh"
  }
};

function hrLang(hass) {
  const lang = hass?.locale?.language || hass?.language || 'en';
  if (HR_STRINGS[lang]) return lang;
  const base = lang.split('-')[0];
  return HR_STRINGS[base] ? base : 'en';
}

function hrT(hass, key, vars = {}) {
  const table = HR_STRINGS[hrLang(hass)];
  let text = table[key] ?? HR_STRINGS.en[key] ?? key;
  for (const [k, v] of Object.entries(vars)) text = text.replace(`{${k}}`, v);
  return text;
}

function hrCount(hass, key, n) {
  return hrT(hass, n === 1 ? `${key}_one` : `${key}_other`, { n });
}

const HR_ICONS = {
  keep_on: 'mdi:power-plug-outline',
  auto_off: 'mdi:timer-outline',
  sensor_flash: 'mdi:alarm-light-outline',
  sensor_chime: 'mdi:bell-ring-outline',
  appliance_resume: 'mdi:dishwasher',
  cycle_done: 'mdi:check-circle-outline',
  vacuum_follow: 'mdi:robot-vacuum',
  vacuum_guard: 'mdi:shield-home-outline',
  presence_light: 'mdi:motion-sensor',
  lock_guard: 'mdi:lock-outline',
  leak_guard: 'mdi:water-alert-outline',
};
const HR_TYPE_ORDER = Object.keys(HR_ICONS);

// Rule state -> tone of the charter (red alert, amber active, blue waiting, green armed, grey rest).
const HR_TONE = {
  alert: 'red',
  failed: 'red',
  active: 'amber',
  waiting: 'blue',
  armed: 'green',
  idle: 'grey',
  disabled: 'grey',
  snoozed: 'grey',
};
const HR_TONE_RANK = { red: 4, amber: 3, blue: 2, green: 1, grey: 0 };

const HR_FILTERS = {
  all: null,
  alerts: ['sensor_flash', 'leak_guard', 'vacuum_guard'],
  plugs: ['keep_on', 'auto_off'],
  lights: ['presence_light', 'vacuum_follow', 'sensor_flash'],
  vacuum: ['vacuum_follow', 'vacuum_guard'],
  appliances: ['appliance_resume', 'cycle_done'],
};

// ---------- shared subscription ----------
const hrHub = (window.__houseRulesHub ??= { listeners: new Set(), data: undefined, unsub: null, connection: null });

function hrSubscribe(hass, listener) {
  hrHub.listeners.add(listener);
  if (hrHub.data !== undefined) listener(hrHub.data);
  if (!hrHub.unsub || hrHub.connection !== hass.connection) {
    if (hrHub.unsub) hrHub.unsub.then((u) => u()).catch(() => {});
    hrHub.connection = hass.connection;
    hrHub.unsub = hass.connection
      .subscribeMessage(
        (data) => {
          hrHub.data = data;
          for (const l of hrHub.listeners) l(data);
        },
        { type: 'house_rules/subscribe' },
      )
      .catch(() => {
        hrHub.data = null;
        for (const l of hrHub.listeners) l(null);
        return () => {};
      });
  }
  return () => hrHub.listeners.delete(listener);
}

function hrEsc(text) {
  return String(text ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
}

function hrDuration(seconds) {
  seconds = Math.max(0, Math.round(seconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h) return `${h} h ${String(m).padStart(2, '0')}`;
  if (m >= 10) return `${m} min`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function hrTime(hass, ts) {
  try {
    return new Date(ts * 1000).toLocaleTimeString(hass?.locale?.language || undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (_err) {
    return '';
  }
}

// ---------- illustrated header: objects on the ground bar, one per configured family, coloured by status ----------
const HR_FAMILY = {
  plug: ['keep_on', 'auto_off'],
  lamp: ['presence_light', 'sensor_flash'],
  robot: ['vacuum_follow', 'vacuum_guard'],
  lock: ['lock_guard'],
  bell: ['sensor_chime'],
  appliance: ['appliance_resume', 'cycle_done'],
  drop: ['leak_guard'],
};
const HR_SCENE_MAX = 4;
const HR_COLOR = { red: '#EF4444', amber: '#F59E0B', blue: '#3B82F6', green: '#16A34A', grey: '#9AA3B1' };

function hrFamilyTone(rules, family) {
  let best = null;
  for (const r of rules) {
    if (!HR_FAMILY[family].includes(r.type)) continue;
    const tone = HR_TONE[r.state] || 'grey';
    if (best === null || HR_TONE_RANK[tone] > HR_TONE_RANK[best]) best = tone;
  }
  return best;
}

function hrScene(rules, night) {
  const fill = night ? '#2A3242' : '#FFFFFF';
  const line = night ? '#9CA3AF' : '#9AA3B1';
  const draw = {
    plug: (c) =>
      `<rect x="0" y="50" width="26" height="35" rx="5" fill="${fill}" stroke="${line}" stroke-width="1.5"/><circle cx="9" cy="64" r="2" fill="${line}"/><circle cx="17" cy="64" r="2" fill="${line}"/><circle cx="13" cy="76" r="3" fill="${c}"/>`,
    lamp: (c, t) =>
      `${t === 'grey' ? '' : `<circle cx="14" cy="44" r="20" class="hr-glow" fill="${c}" opacity=".3"/>`}<line x1="14" y1="56" x2="14" y2="85" stroke="${line}" stroke-width="2"/><path d="M2,48 h24 l-4,-14 h-16 z" fill="${t === 'grey' ? fill : c}" stroke="${line}" stroke-width="1"/><rect x="6" y="82" width="16" height="3" fill="${line}"/>`,
    robot: (c, t) =>
      `<g class="${t === 'amber' ? 'hr-roll' : ''}"><ellipse cx="18" cy="80" rx="17" ry="6" fill="${c}"/><rect x="12" y="73" width="12" height="3" rx="1.5" fill="#BFDBFE"/></g>`,
    lock: (c, t) =>
      `<g class="${t === 'red' ? 'hr-blink' : ''}"><rect x="0" y="58" width="22" height="27" rx="3" fill="${fill}" stroke="${line}" stroke-width="1.5"/><path d="M5,58 v-6 a6,6 0 0 1 12,0 v6" fill="none" stroke="${c}" stroke-width="2"/><circle cx="11" cy="71" r="2.5" fill="${c}"/></g>`,
    bell: (c) =>
      `<path d="M2,72 a10,10 0 0 1 20,0 c0,8 3,10 3,10 h-26 s3,-2 3,-10" fill="${fill}" stroke="${c}" stroke-width="1.5"/><circle cx="12" cy="85" r="2.5" fill="${c}"/>`,
    appliance: (c) =>
      `<rect x="0" y="46" width="30" height="39" rx="3" fill="${fill}" stroke="${c}" stroke-width="1.5"/><line x1="0" y1="54" x2="30" y2="54" stroke="${c}" stroke-width="1.5"/><circle cx="15" cy="70" r="8" fill="none" stroke="${c}" stroke-width="1.5"/>`,
    drop: (c, t) =>
      `<g class="${t === 'red' ? 'hr-blink' : ''}"><path d="M12,52 s10,11 10,19 a10,10 0 0 1 -20,0 c0,-8 10,-19 10,-19z" fill="${fill}" stroke="${c}" stroke-width="1.5"/></g>`,
  };
  const width = { plug: 26, lamp: 28, robot: 36, lock: 22, bell: 26, appliance: 30, drop: 24 };
  // At most HR_SCENE_MAX objects, so the scene never runs under the title: the most urgent families (red first, then
  // amber, blue, green, grey; ties in the usual order), drawn in the usual order so an object keeps its place.
  const families = Object.keys(HR_FAMILY);
  const tones = Object.fromEntries(families.map((f) => [f, hrFamilyTone(rules, f)]));
  const shown = new Set(
    families
      .filter((f) => tones[f] !== null)
      .sort((a, b) => HR_TONE_RANK[tones[b]] - HR_TONE_RANK[tones[a]] || families.indexOf(a) - families.indexOf(b))
      .slice(0, HR_SCENE_MAX),
  );
  let x = 0;
  let svg = '';
  for (const family of families) {
    if (!shown.has(family)) continue;
    const tone = tones[family];
    svg += `<g transform="translate(${x},0)">${draw[family](HR_COLOR[tone], tone)}</g>`;
    x += width[family] + 22;
  }
  if (!svg) svg = draw.plug(HR_COLOR.grey, 'grey');
  return `<svg class="hr-scene" aria-hidden="true" width="${Math.max(x, 60)}" height="90" viewBox="0 0 ${Math.max(x, 60)} 90">${svg}</svg>`;
}

// Animations of the illustrated header, shared with the panel.
const HR_ANIM_CSS = `
  .hr-blink { animation: hr-blink 1s steps(1) infinite; }
  @keyframes hr-blink { 50% { opacity: .15; } }
  .hr-glow { animation: hr-glow 3s ease-in-out infinite; }
  @keyframes hr-glow { 50% { opacity: .6; } }
  .hr-roll { animation: hr-roll 6s ease-in-out infinite alternate; }
  @keyframes hr-roll { to { transform: translateX(-18px); } }
  @media (prefers-reduced-motion: reduce) { .hr-blink, .hr-glow, .hr-roll { animation: none; } }
`;

const HR_CSS = `
  :host { display: block; }
  ha-card { overflow: hidden; }
  .hdr { position: relative; height: 90px; overflow: hidden; background: var(--hr-sky); }
  .hdr .hr-scene { position: absolute; right: 16px; bottom: 5px; }
  .hdr .ground { position: absolute; left: 0; right: 0; bottom: 0; height: 5px; background: var(--hr-ground); }
  .hdrc { position: absolute; left: 16px; top: 16px; right: 16px; display: flex; align-items: flex-start; gap: 12px; }
  .ico { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex: none; }
  .ico ha-icon { --mdc-icon-size: 22px; }
  .ttl { font-weight: 700; font-size: 16px; line-height: 20px; color: var(--primary-text-color); }
  .sub { font-size: 13px; line-height: 18px; color: var(--secondary-text-color); }
  .grow { flex: 1; min-width: 0; }
  .pill { display: inline-flex; align-items: center; gap: 6px; height: 24px; padding: 0 10px; border-radius: 12px; font-size: 12px; font-weight: 600; white-space: nowrap; }
  .dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
  .rbtn { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--divider-color); background: color-mix(in srgb, var(--card-background-color) 70%, transparent); color: var(--primary-text-color); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; }
  .rbtn ha-icon { --mdc-icon-size: 18px; }
  .body { padding: 16px; }
  .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .tile { position: relative; display: flex; gap: 12px; align-items: center; padding: 12px; border-radius: 12px; background: var(--hr-tile); min-width: 0; }
  .tname { font-weight: 700; font-size: 14px; line-height: 18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--primary-text-color); }
  .tstate { font-size: 12px; line-height: 16px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .badge { position: absolute; top: 8px; right: 8px; width: 9px; height: 9px; border-radius: 50%; box-shadow: 0 0 0 2px var(--hr-tile); }
  .banner { grid-column: 1 / -1; display: flex; gap: 12px; align-items: center; padding: 12px; border-radius: 12px; background: var(--hr-red-bg); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--hr-red) 35%, transparent); }
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 36px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--divider-color); background: transparent; color: var(--primary-text-color); font-family: inherit; font-weight: 600; font-size: 13px; cursor: pointer; }
  .btn.red { border-color: var(--hr-red); color: var(--hr-red); }
  .rings { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
  .ring { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 14px 8px; border-radius: 12px; background: var(--hr-tile); text-align: center; }
  .ring .tname { white-space: normal; font-size: 13px; }
  .row { display: flex; gap: 6px; }
  .empty { padding: 8px 0; color: var(--secondary-text-color); font-size: 13px; }
  ul { list-style: none; margin: 6px 0 0; padding: 0; }
  li { display: flex; gap: 10px; align-items: center; padding: 9px 0; border-bottom: 1px solid var(--divider-color); }
  li:last-child { border-bottom: 0; }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .chip { height: 28px; border: 0; border-radius: 14px; padding: 0 12px; cursor: pointer; font-family: inherit; font-weight: 600; font-size: 12px; background: var(--hr-tile); color: var(--primary-text-color); }
  .chip.on { background: var(--primary-color); color: var(--text-primary-color, #fff); }
`;

const HR_TONES_LIGHT = {
  red: ['#B91C1C', '#FEE2E2'],
  amber: ['#B45309', '#FEF3C7'],
  blue: ['#1D4ED8', '#DBEAFE'],
  green: ['#15803D', '#DCFCE7'],
  grey: ['#4B5563', '#E5E7EB'],
  indigo: ['#4338CA', '#E0E7FF'],
};
const HR_TONES_DARK = {
  red: ['#FCA5A5', '#7F1D1D'],
  amber: ['#FBBF24', '#5B3A0A'],
  blue: ['#93C5FD', '#1E3A8A'],
  green: ['#4ADE80', '#14532D'],
  grey: ['#D1D5DB', '#374151'],
  indigo: ['#A5B4FC', '#312E81'],
};

class HouseRulesBase extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._data = undefined;
  }

  setConfig(config) {
    this._config = { ...(config || {}) };
    this._render();
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    // Home Assistant sets hass at every state change anywhere: redraw only when what the card shows depends on it.
    const key = `${hrLang(hass)}|${Boolean(hass?.themes?.darkMode)}`;
    if (first || !this._unsub) this._unsub = hrSubscribe(hass, (data) => this._update(data));
    else if (key !== this._hassKey) this._render();
    this._hassKey = key;
  }

  connectedCallback() {
    if (this._hass && !this._unsub) this._unsub = hrSubscribe(this._hass, (data) => this._update(data));
  }

  disconnectedCallback() {
    this._unsub?.();
    this._unsub = null;
    this._expanded = false;
  }

  _update(data) {
    this._data = data;
    this._render();
  }

  get night() {
    const theme = this._config?.illustration_theme;
    if (theme === 'night') return true;
    if (theme === 'day') return false;
    return Boolean(this._hass?.themes?.darkMode);
  }

  tones() {
    return this.night ? HR_TONES_DARK : HR_TONES_LIGHT;
  }

  vars() {
    const n = this.night;
    const t = this.tones();
    return `--hr-sky:${n ? '#1E2533' : '#EEF2F8'};--hr-ground:${n ? '#4B5563' : '#C9CED6'};--hr-tile:${n ? 'rgba(255,255,255,.05)' : '#F7F8FA'};--hr-red:${t.red[0]};--hr-red-bg:${t.red[1]};`;
  }

  icon(icon, tone, size = 40) {
    const [fg, bg] = this.tones()[tone] || this.tones().grey;
    return `<div class="ico" style="width:${size}px;height:${size}px;background:${bg};color:${fg}"><ha-icon icon="${icon}"></ha-icon></div>`;
  }

  pill(text, tone) {
    const [fg, bg] = this.tones()[tone] || this.tones().grey;
    return `<span class="pill" style="background:${bg};color:${fg}"><span class="dot"></span>${hrEsc(text)}</span>`;
  }

  header(title, sub, status, tone, button) {
    const rules = this._data?.rules || [];
    const iconTone = tone === 'red' ? 'red' : tone === 'amber' ? 'amber' : 'indigo';
    return `<div class="hdr">${hrScene(rules, this.night)}<div class="ground"></div><div class="hdrc">${this.icon('house-rules:emblem', iconTone)}<div class="grow"><div class="ttl">${hrEsc(title)}</div><div class="sub">${hrEsc(sub)}</div></div><div class="row" style="align-items:center">${this.pill(status, tone)}${button || ''}</div></div></div>`;
  }

  frame(inner) {
    this.shadowRoot.innerHTML = `<style>${HR_CSS}${HR_ANIM_CSS}</style><ha-card style="${this.vars()}">${inner}</ha-card>`;
  }

  call(msg) {
    return this._hass.connection.sendMessagePromise(msg).catch(() => {});
  }

  getCardSize() {
    return 4;
  }
}

class HouseRulesCard extends HouseRulesBase {
  static FULL = true;

  static getStubConfig() {
    return {};
  }

  static getConfigForm() {
    return {
      schema: [
        { name: 'title', selector: { text: {} } },
        {
          name: 'illustration_theme',
          selector: { select: { mode: 'dropdown', options: ['auto', 'day', 'night'] } },
        },
      ],
    };
  }

  get full() {
    return this.constructor.FULL || this._expanded;
  }

  summary() {
    const d = this._data;
    const alerts = d.alerts?.length || 0;
    const timers = d.timers?.length || 0;
    const parts = [];
    if (alerts) parts.push(hrCount(this._hass, 'alerts', alerts));
    if (timers) parts.push(hrCount(this._hass, 'timers', timers));
    if (!parts.length) parts.push(hrCount(this._hass, 'rules', d.rules?.length || 0));
    return {
      sub: parts.join(' · '),
      status: alerts ? hrT(this._hass, 'alerts') : hrT(this._hass, 'all_good'),
      tone: alerts ? 'red' : timers ? 'amber' : 'green',
    };
  }

  tileFor(type, rules) {
    let best = rules[0];
    for (const r of rules) {
      if (HR_TONE_RANK[HR_TONE[r.state] || 'grey'] > HR_TONE_RANK[HR_TONE[best.state] || 'grey']) best = r;
    }
    const tone = HR_TONE[best.state] || 'grey';
    const [fg] = this.tones()[tone];
    let line = hrT(this._hass, `state.${best.state}`);
    if (best.detail) line += ` · ${best.detail}`;
    else if (type === 'auto_off') {
      const timers = (this._data.timers || []).length;
      if (timers) line = hrCount(this._hass, 'timers', timers);
    } else if (rules.length > 1) line += ` · ${hrCount(this._hass, 'rules', rules.length)}`;
    return `<div class="tile"><span class="badge" style="background:${fg}"></span>${this.icon(HR_ICONS[type], tone)}<div class="grow"><div class="tname">${hrEsc(hrT(this._hass, `type.${type}`))}</div><div class="tstate" style="color:${fg}">${hrEsc(line)}</div></div></div>`;
  }

  _render() {
    if (!this._config || !this._hass) return;
    const title = this._config.title || hrT(this._hass, 'title');
    if (this._data === undefined) return this.frame(this.header(title, '…', '…', 'grey'));
    if (this._data === null)
      return this.frame(this.header(title, hrT(this._hass, 'not_loaded'), '!', 'grey'));
    const s = this.summary();
    let button = '';
    if (!this.constructor.FULL) {
      const label = hrT(this._hass, this._expanded ? 'collapse' : 'expand');
      button = `<button class="rbtn" id="toggle" aria-label="${label}" title="${label}"><ha-icon icon="${this._expanded ? 'mdi:chevron-up' : 'mdi:chevron-down'}"></ha-icon></button>`;
    }
    let body = '';
    if (this.full) {
      const byType = {};
      const allowed = this._config.types;
      for (const r of this._data.rules || []) {
        if (allowed && !allowed.includes(r.type)) continue;
        (byType[r.type] ||= []).push(r);
      }
      const banners = (this._data.alerts || [])
        .map(
          (a) =>
            `<div class="banner">${this.icon(HR_ICONS[a.type] || 'mdi:alarm-light-outline', 'red')}<div class="grow"><div class="tname">${hrEsc(a.name)}</div><div class="tstate" style="color:var(--hr-red)">${hrEsc(a.detail || hrT(this._hass, 'state.alert'))}</div></div><button class="btn red" data-ack="${hrEsc(a.id)}">${hrT(this._hass, 'acknowledge')}</button></div>`,
        )
        .join('');
      const tiles = HR_TYPE_ORDER.filter((t) => byType[t])
        .map((t) => this.tileFor(t, byType[t]))
        .join('');
      body = `<div class="body"><div class="grid">${banners}${tiles}</div></div>`;
    }
    this.frame(this.header(title, s.sub, s.status, s.tone, button) + body);
    this.shadowRoot.getElementById('toggle')?.addEventListener('click', (ev) => {
      ev.stopPropagation();
      this._expanded = !this._expanded;
      this._render();
    });
    for (const b of this.shadowRoot.querySelectorAll('[data-ack]')) {
      b.addEventListener('click', () => this.call({ type: 'house_rules/action', rule: b.dataset.ack, action: 'acknowledge' }));
    }
  }

  getCardSize() {
    return this.full ? 5 : 2;
  }
}

class HouseRulesMiniCard extends HouseRulesCard {
  static FULL = false;

  connectedCallback() {
    super.connectedCallback();
    this._outside = (ev) => {
      if (this._expanded && !ev.composedPath().includes(this)) {
        this._expanded = false;
        this._render();
      }
    };
    document.addEventListener('click', this._outside, true);
  }

  disconnectedCallback() {
    document.removeEventListener('click', this._outside, true);
    super.disconnectedCallback();
  }
}

class HouseRulesTimersCard extends HouseRulesBase {
  static getStubConfig() {
    return {};
  }

  static getConfigForm() {
    return { schema: [{ name: 'title', selector: { text: {} } }] };
  }

  connectedCallback() {
    super.connectedCallback();
    this._tick = setInterval(() => this._render(), 1000);
  }

  disconnectedCallback() {
    clearInterval(this._tick);
    super.disconnectedCallback();
  }

  ring(timer) {
    const now = Date.now() / 1000;
    const left = Math.max(0, timer.ends - now);
    const pct = Math.max(0, Math.min(1, left / timer.total));
    const r = 26;
    const c = 2 * Math.PI * r;
    const [fg] = this.tones().amber;
    return `<div class="ring"><div style="position:relative;width:72px;height:72px"><svg aria-hidden="true" width="72" height="72" viewBox="0 0 64 64"><circle cx="32" cy="32" r="${r}" fill="none" stroke="var(--divider-color)" stroke-width="6"/><circle cx="32" cy="32" r="${r}" fill="none" stroke="${fg}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - pct)).toFixed(1)}" transform="rotate(-90 32 32)"/></svg><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px">${hrDuration(left)}</div></div><div class="tname">${hrEsc(timer.name)}</div><div class="row"><button class="btn" data-extend="${hrEsc(timer.entity_id)}" aria-label="${hrT(this._hass, 'extend')}">+15</button><button class="btn" data-off="${hrEsc(timer.entity_id)}" aria-label="${hrT(this._hass, 'turn_off')}"><ha-icon icon="mdi:power" style="--mdc-icon-size:16px"></ha-icon></button></div></div>`;
  }

  _render() {
    if (!this._config || !this._hass) return;
    const title = this._config.title || hrT(this._hass, 'timers_title');
    if (!this._data) return this.frame(this.header(title, this._data === null ? hrT(this._hass, 'not_loaded') : '…', '…', 'grey'));
    const timers = this._data.timers || [];
    const body = timers.length
      ? `<div class="rings">${timers.map((t) => this.ring(t)).join('')}</div>`
      : `<div class="empty">${hrT(this._hass, 'no_timer')}</div>`;
    const n = timers.length;
    this.frame(
      this.header(title, n ? hrCount(this._hass, 'timers', n) : hrT(this._hass, 'no_timer'), String(n), n ? 'amber' : 'grey') +
        `<div class="body">${body}</div>`,
    );
    for (const b of this.shadowRoot.querySelectorAll('[data-extend]'))
      b.addEventListener('click', () => this.call({ type: 'house_rules/timer', entity_id: b.dataset.extend, action: 'extend', minutes: 15 }));
    for (const b of this.shadowRoot.querySelectorAll('[data-off]'))
      b.addEventListener('click', () => this.call({ type: 'house_rules/timer', entity_id: b.dataset.off, action: 'off' }));
  }
}

const HR_RESULT_TONE = { ok: 'green', skipped: 'grey', active: 'red', failed: 'red' };

class HouseRulesActivityCard extends HouseRulesBase {
  static getStubConfig() {
    return { limit: 8 };
  }

  static getConfigForm() {
    return {
      schema: [
        { name: 'title', selector: { text: {} } },
        { name: 'limit', selector: { number: { min: 1, max: 50, mode: 'box' } } },
      ],
    };
  }

  _render() {
    if (!this._config || !this._hass) return;
    const title = this._config.title || hrT(this._hass, 'activity_title');
    if (!this._data) return this.frame(this.header(title, this._data === null ? hrT(this._hass, 'not_loaded') : '…', '…', 'grey'));
    const filter = this._filter || 'all';
    const types = HR_FILTERS[filter];
    let items = [...(this._data.journal || [])].reverse();
    if (filter === 'failures') items = items.filter((e) => e.result === 'failed');
    else if (types) items = items.filter((e) => types.includes(e.type));
    items = items.slice(0, this._config.limit || 8);
    const today = new Date().toDateString();
    const count = (this._data.journal || []).filter((e) => new Date(e.ts * 1000).toDateString() === today).length;
    const chips = ['all', 'alerts', 'plugs', 'vacuum', 'failures']
      .map((f) => `<button class="chip ${f === filter ? 'on' : ''}" data-filter="${f}">${hrT(this._hass, f)}</button>`)
      .join('');
    const rows = items.length
      ? items
          .map((e) => {
            const tone = HR_RESULT_TONE[e.result] || 'grey';
            return `<li>${this.icon(HR_ICONS[e.type] || 'mdi:information-outline', tone, 32)}<div class="grow"><div class="tname" style="font-size:13px">${hrEsc(e.name || e.rule || '')}</div><div class="sub" style="font-size:12px">${hrEsc(e.detail)}</div></div><span class="sub" style="font-size:12px">${hrTime(this._hass, e.ts)}</span></li>`;
          })
          .join('')
      : `<li class="empty">${hrT(this._hass, 'no_activity')}</li>`;
    const failed = (this._data.journal || []).some((e) => e.result === 'failed');
    this.frame(
      this.header(title, `${count}`, failed ? hrT(this._hass, 'failures') : 'OK', failed ? 'red' : 'green') +
        `<div class="body" style="padding-top:12px"><div class="chips" role="group">${chips}</div><ul>${rows}</ul></div>`,
    );
    for (const b of this.shadowRoot.querySelectorAll('[data-filter]'))
      b.addEventListener('click', () => {
        this._filter = b.dataset.filter;
        this._render();
      });
  }

  getCardSize() {
    return 5;
  }
}

// What the panel reuses (it loads this module first): no copy of the scene, icons, tones and labels.
window.__houseRulesShared = {
  scene: hrScene,
  icons: HR_ICONS,
  tone: HR_TONE,
  tones: { light: HR_TONES_LIGHT, dark: HR_TONES_DARK },
  esc: hrEsc,
  duration: hrDuration,
  t: hrT,
  strings: HR_STRINGS,
  animCss: HR_ANIM_CSS,
};

const HR_CARDS = [
  ['house-rules-card', HouseRulesCard, 'House Rules', 'Overview of your house rules: alerts and one tile per rule type.'],
  ['house-rules-mini-card', HouseRulesMiniCard, 'House Rules (mini)', 'House Rules folded to its illustrated header.'],
  ['house-rules-timers-card', HouseRulesTimersCard, 'House Rules timers', 'Running auto-off timers: +15 min, turn off.'],
  ['house-rules-activity-card', HouseRulesActivityCard, 'House Rules activity', 'What the house rules did, filterable.'],
];
window.customCards = window.customCards || [];
for (const [tag, cls, name, description] of HR_CARDS) {
  if (!customElements.get(tag)) customElements.define(tag, cls);
  if (!window.customCards.some((c) => c.type === tag)) window.customCards.push({ type: tag, name, description, preview: true });
}
console.info(`%c HOUSE-RULES-CARDS %c ${HR_VERSION} `, 'color:#fff;background:#4f46e5;font-weight:700', '');
