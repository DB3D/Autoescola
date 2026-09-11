import type { RevisionPage, RevisionTheme } from './types';
import { frenchQuestions } from './french';
import { extraThemes } from './extra-content';

type Item = [prompt: string, correct: string, wrong1: string, wrong2: string, explanation: string];
const page = (title: string, kicker: string, facts: string[], tip: string, words: [string, string][], grammar: [string, string, string, string]): RevisionPage => ({ title, kicker, facts, tip, words, grammar: { title: grammar[0], rule: grammar[1], ca: grammar[2], fr: grammar[3] } });
function theme(id: string, title: string, icon: string, color: string, subtitle: string, categories: string[], bankIds: string[], sources: string, articles: string, pages: RevisionPage[], items: Item[][]): RevisionTheme {
  return { id, title, icon, color, subtitle, categories, bankIds, sources, articles, pages,
    questions: items.flatMap((rows, p) => rows.map(([prompt, correct, wrong1, wrong2, explanation], i) => {
      const [promptFr, ...answersFr] = frenchQuestions[id][p * 7 + i];
      return { id: `${id}-${p + 1}-${i + 1}`, page: p, prompt, answers: [correct, wrong1, wrong2], correct: 0, explanation, french: { prompt: promptFr, answers: answersFr } };
    })) };
}

// Original, non-visual teaching questions: each answer is taught on its linked
// page. Source IDs are research anchors, not copies fed into driving scores.
export const themes: RevisionTheme[] = [
  theme('routes', 'Routes & vitesse', '🛣️', 'blue', 'Se repérer. Choisir son allure.', ['SPEED', 'LANES', 'HIGHWAY', 'DISTANCE'], ['952', '927', '7404', '7482', '1130'], 'Synthèse p. 5–6, 12–13 · QCM p. 3–4', '6, 8, 10, 20', [
    page('La bonne voie, la bonne vitesse', '90 · 60 · 50', [
      "Sur une **route générale**, la limite habituelle est de **90 km/h**. Sur une **route secondaire**, elle est de **60 km/h** : commence par identifier le type de route.",
      "**En agglomération, la limite habituelle est de 50 km/h.** Dans une zone 30 ou une zone 20, le nombre indiqué donne la vitesse maximale de cette zone.",
      "Ces valeurs s’appliquent **en l’absence d’une autre signalisation**. Un panneau ou une limite propre à ton véhicule peut imposer une vitesse différente.",
      "On circule normalement **à droite**. Sur une chaussée à trois voies et à double sens, la voie centrale sert à dépasser ou à tourner à gauche ; on n’y roule pas en permanence.",
      "La **calçada** est la chaussée, divisée en **carrils** (voies). La **vorera** est le trottoir destiné aux piétons ; le **voral** est l’accotement qui borde la chaussée."
    ], "Une limitation indique une **vitesse maximale**, pas une vitesse à atteindre. Si la visibilité ou l’adhérence sont mauvaises, tu dois choisir une allure plus basse pour rester en sécurité.", [['poblat', 'agglomération'], ['dreta / esquerra', 'droite / gauche'], ['carril / carrer', 'voie / rue']], ['Si no hi ha…', "Si signifie « si » et no hi ha signifie « il n’y a pas ». Lis d’abord la condition : la limite annoncée ensuite vaut lorsqu’aucun autre panneau ne donne une consigne différente.", 'Si no hi ha un altre senyal, el límit és de 60 km/h.', 'S’il n’y a pas d’autre panneau, la limite est de 60 km/h.']),
    page('Garder une marge pour s’arrêter', 'VOIR → RÉAGIR → FREINER', [
      "Le **temps de réaction** commence quand tu perçois un danger et se termine quand tu commences à freiner. Pendant ce délai, la voiture continue d’avancer.",
      "La **distance de freinage** est la distance parcourue entre le début du freinage et l’arrêt complet. Elle commence donc après la phase de réaction.",
      "La **distance d’arrêt additionne la distance de réaction et la distance de freinage**. Pour éviter un obstacle, il faut disposer de toute cette distance devant soi.",
      "Plus tu roules vite, plus la **distance nécessaire pour t’arrêter augmente**. La fatigue peut aussi retarder ta réaction : tu parcours alors davantage de mètres avant de freiner.",
      "Sous la pluie ou avec une faible visibilité, **ralentis et augmente la distance de sécurité**. Cet espace supplémentaire te laisse une marge si le véhicule devant freine.",
      "Choisis une allure qui permet de t’arrêter **dans la portion de route que tu vois**. Ralentis avant un virage ou un passage étroit, sans attendre de découvrir un obstacle."
    ], "Imagine deux étapes : **je comprends le danger, puis la voiture freine**. De bons freins ne suppriment pas la première étape ; la vitesse, les pneus, la chaussée et ton état influencent l’ensemble.", [['frenada', 'freinage'], ['detenció', 'arrêt / immobilisation'], ['davant', 'devant']], ['Més / menys', "Més veut dire « plus » et menys veut dire « moins ». Dans une comparaison, repère ce qui augmente ou diminue : més velocitat annonce plus de vitesse, més distància annonce plus de distance.", 'Més velocitat, més distància de frenada.', 'Plus de vitesse, plus de distance de freinage.'])
  ], [
    [
      ['Sense un altre senyal, quin límit general té una carretera general?', '90 km/h.', '60 km/h.', '120 km/h.', 'Route générale : 90 km/h, sauf autre signalisation ou limite propre au véhicule.'],
      ['En una carretera secundària, quin és el límit general?', '60 km/h.', '90 km/h.', '80 km/h.', 'Le repère secondaire est 60 km/h.'],
      ['Dins de poblat, fora de zones especials, quin és el límit general?', '50 km/h.', '60 km/h.', '90 km/h.', 'En ville : 50 km/h par défaut.'],
      ['En una zona 20, quina velocitat màxima indica la zona?', '20 km/h.', '30 km/h.', '50 km/h.', 'Le nombre de la zone donne son plafond.'],
      ['Com a norma general, per quin costat hem de circular?', 'Per la dreta.', 'Per l’esquerra.', 'Pel centre.', 'Dreta = droite. On roule normalement à droite.'],
      ['En una calçada de doble sentit amb tres carrils, per a què serveix el central?', 'Per avançar o girar a l’esquerra.', 'Per estacionar.', 'Per circular-hi sempre.', 'La voie centrale sert à ces manœuvres, pas à la circulation normale.'],
      ['Quina part de la via està destinada als vianants?', 'La vorera.', 'El carril.', 'La calçada.', 'Vorera = trottoir. Attention à voral = accotement.']
    ], [
      ['Què és el temps de reacció?', 'El temps entre percebre el perill i començar a frenar.', 'El temps amb el vehicle estacionat.', 'Només el temps de frenada.', 'La réaction précède le freinage.'],
      ['Quan comença la distància de frenada?', 'Quan comencem a frenar.', 'Quan veiem el perill.', 'Quan el vehicle ja està aturat.', 'Elle commence à l’action sur le frein.'],
      ['La distància de detenció és la suma de…', 'La distància de reacció i la de frenada.', 'La llargada i l’amplada del vehicle.', 'La velocitat i el temps d’estacionament.', 'Arrêt = réaction + freinage.'],
      ['Si augmenta la velocitat, què passa amb la distància de detenció?', 'Augmenta.', 'Disminueix sempre.', 'No canvia.', 'Plus vite = davantage de distance pour s’arrêter.'],
      ['Amb pluja, com hem d’adaptar la distància de seguretat?', 'Augmentar-la.', 'Reduir-la.', 'Eliminar-la si tenim bons frens.', 'La pluie réduit l’adhérence : garde davantage de marge.'],
      ['Amb poca visibilitat, hem de poder aturar-nos…', 'Dins de la zona visible.', 'Després de la zona visible.', 'Només quan ho indiqui un senyal.', 'Adapte l’allure à ce que tu peux réellement voir.'],
      ['Quin efecte pot tenir el cansament?', 'Allargar el temps de reacció.', 'Reduir sempre la distància de frenada.', 'Millorar l’atenció.', 'Cansament = fatigue : la réaction peut être plus lente.']
    ]
  ]),
  theme('priorites', 'Priorités & signaux', '🚦', 'rose', 'Savoir qui passe en premier.', ['PRIORITY', 'ROUNDABOUT', 'SIGNS', 'SIGNALING', 'PEDESTRIANS'], ['1155', '1147', '1666', '1694', '923'], 'Synthèse p. 8–9, 16 · QCM p. 3–4, 9–10', '12, 13, 14, 84', [
    page('Lire les consignes dans le bon ordre', 'AGENT → BALISAGE → FEU → PANNEAU → SOL', [
      "**L’ordre d’un agent est prioritaire sur les autres signaux.** S’il te demande de t’arrêter, tu t’arrêtes, même lorsque le feu est vert.",
      "Après l’agent viennent **le balisage temporaire, les feux, les panneaux, puis le marquage au sol**. Cet ordre permet de choisir quelle consigne suivre lorsqu’elles se contredisent.",
      "Si deux signaux **du même type** se contredisent, suis le plus restrictif. Il s’agit de la consigne qui limite le plus ce que tu peux faire.",
      "Au **STOP, l’arrêt doit être complet**, à la ligne prévue. Si tu ne vois pas suffisamment, avance prudemment puis arrête-toi de nouveau avant de t’engager.",
      "**Cediu el pas** signifie « cédez le passage ». Tu dois laisser passer les usagers prioritaires et t’arrêter si cela est nécessaire pour les laisser circuler.",
      "N’entre pas dans un carrefour si tu risques de **rester bloqué au milieu**. Même avec la priorité, attends de pouvoir dégager le passage de l’autre côté."
    ], "Au STOP, **ralentir ne suffit jamais** : les roues doivent s’immobiliser. Au cédez-le-passage, l’objectif est de laisser passer ; l’arrêt dépend donc de la situation.", [['senyal', 'signal / panneau'], ['semàfor', 'feu tricolore'], ['aturar-se', 's’arrêter']], ['Cal / no cal', "Cal suivi d’un infinitif signifie « il faut faire cette action ». No cal signifie « ce n’est pas nécessaire » : cela retire l’obligation, mais n’interdit pas l’action.", 'Al STOP cal aturar-se.', 'Au STOP, il faut s’arrêter.']),
    page('Carrefours, ronds-points, piétons', 'DROITE · DÉJÀ DEDANS · PIÉTONS', [
      "À un carrefour **sans signalisation**, la règle générale est la priorité à droite. Tu laisses donc passer le véhicule qui arrive de ton côté droit.",
      "Dans un rond-point, ce sont les véhicules **déjà dans l’anneau** qui ont la priorité, sauf indication contraire. Avant d’entrer, vérifie que tu peux le faire sans les gêner.",
      "Les mots catalans **rotonda et glorieta** désignent tous les deux un rond-point. Une question peut employer l’un ou l’autre pour parler de la même situation.",
      "Quand tu tournes, laisse passer les piétons qui traversent la rue dans laquelle tu entres. Cette priorité existe **même sans passage piéton marqué** à cet endroit.",
      "Au passage piéton, **laisse les personnes traverser**. Près d’une école ou d’enfants, réduis ton allure et surveille aussi les trottoirs pour anticiper une traversée.",
      "Un ballon qui arrive sur la chaussée peut annoncer **un enfant qui le suit**. Ralentis et prépare-toi à t’arrêter avant même de voir l’enfant."
    ], "Pose-toi la question **« où suis-je ? »** avant d’appliquer une priorité. Le carrefour ordinaire sans signalisation et le rond-point ne suivent pas le même repère.", [['cruïlla', 'carrefour'], ['vianant', 'piéton'], ['cedir el pas', 'céder le passage']], ['Encara que…', "Encara que signifie « même si ». Cette expression précise qu’une règle reste valable malgré une circonstance : ici, l’absence de passage marqué ne supprime pas la priorité décrite.", 'Cediu el pas, encara que no hi hagi pas senyalitzat.', 'Cédez le passage, même s’il n’y a pas de passage marqué.'])
  ], [
    [
      ['Un agent ordena aturar-se i el semàfor és verd. Què cal fer?', 'Aturar-se.', 'Continuar perquè el semàfor és verd.', 'Seguir només les marques viàries.', 'L’ordre de l’agent prime sur le feu.'],
      ['Què té prioritat sobre els semàfors?', 'La senyalització circumstancial que modifica l’ús de la via.', 'Les marques viàries.', 'Qualsevol senyal vertical.', 'Le balisage temporaire vient avant les feux.'],
      ['Entre un semàfor i un senyal vertical contradictoris, quin preval?', 'El semàfor.', 'El senyal vertical.', 'Sempre el més antic.', 'Dans cette hiérarchie : feu avant panneau.'],
      ['Dos senyals del mateix tipus es contradiuen. Quin preval?', 'El més restrictiu.', 'El menys restrictiu.', 'El que prefereixi el conductor.', 'Même type : on suit la consigne la plus restrictive.'],
      ['Davant d’un STOP, n’hi ha prou amb reduir la velocitat?', 'No, cal aturar-se completament.', 'Sí, si no ve ningú.', 'Sí, durant el dia.', 'Cal aturar-se = il faut s’arrêter.'],
      ['Davant d’un cediu el pas, quan ens hem d’aturar?', 'Quan sigui necessari per cedir el pas.', 'Sempre durant deu segons.', 'Mai.', 'Cédez-le-passage : arrêt si nécessaire.'],
      ['Podem entrar en una cruïlla si podem quedar-hi bloquejats?', 'No, hem d’esperar.', 'Sí, si tenim prioritat.', 'Sí, si encenem l’intermitent.', 'Il faut laisser le carrefour dégagé.']
    ], [
      ['En una cruïlla sense senyals, a qui cedim el pas com a norma general?', 'A qui ve per la dreta.', 'A qui ve per l’esquerra.', 'Al vehicle més ràpid.', 'Carrefour ordinaire sans signal : priorité à droite.'],
      ['En una rotonda sense indicació contrària, qui té prioritat?', 'Qui ja circula dins.', 'Qui hi entra.', 'Qui porta el vehicle més gran.', 'Déjà dans l’anneau = prioritaire.'],
      ['Quina paraula també significa rotonda?', 'Glorieta.', 'Voral.', 'Pendent.', 'Rotonda et glorieta sont synonymes.'],
      ['En girar, uns vianants travessen la via on entrem sense pas marcat. Què fem?', 'Els cedim el pas.', 'Passem abans perquè no hi ha marques.', 'Toquem el clàxon i continuem.', 'Encara que = même si : l’absence de marquage ne supprime pas cette priorité.'],
      ['Davant d’un pas de vianants amb persones travessant, què cal fer?', 'Deixar-les passar.', 'Accelerar.', 'Obligar-les a esperar al mig.', 'On laisse les piétons traverser.'],
      ['Una pilota entra a la calçada. Què hem de preveure?', 'Que un infant pugui sortir al darrere.', 'Que la via estarà buida.', 'Que cal avançar immediatament.', 'Anticiper l’enfant qui pourrait suivre le ballon.'],
      ['A prop d’una escola amb infants, com hem de conduir?', 'Amb més precaució i velocitat adaptada.', 'Més de pressa per passar aviat.', 'Sense vigilar les voreres.', 'Ralentir et surveiller les abords.']
    ]
  ]),
  theme('manoeuvres', 'Tourner & s’insérer', '↪️', 'teal', 'Observer. Signaler. Manœuvrer.', ['MANEUVER', 'SIGNALING', 'LANES', 'HIGHWAY'], ['941', '947', '942', '953', '1143'], 'Synthèse p. 8–9, 13 · QCM p. 3–4', '11, 16, 23, 24, 25, 35', [
    page('Avant de changer de direction', 'RÉTROS → CLIGNOTANT → MANŒUVRE', [
      "Règle **ton siège, ton dossier et tes rétroviseurs avant le départ**. Tu dois pouvoir atteindre les commandes et observer la circulation sans te réinstaller pendant une manœuvre.",
      "Avant de tourner, observe **devant, derrière et sur les côtés**. Vérifie aussi l’angle mort : cette zone n’apparaît pas dans les rétroviseurs.",
      "Mets le **clignotant suffisamment tôt** pour que les autres comprennent ton intention. Il annonce la manœuvre, mais ne te donne jamais la priorité pour l’effectuer.",
      "Évalue **la vitesse et la distance des véhicules qui approchent**. Un véhicule encore éloigné peut arriver rapidement : sa distance seule ne suffit pas à juger le danger.",
      "Un **canvi de direcció** est un changement de direction, par exemple tourner dans une rue. Un **canvi de sentit** est un demi-tour pour repartir dans le sens opposé.",
      "Pour tourner à droite, rapproche-toi du **bord droit de la chaussée**. Vérifie que ce placement ne met pas en danger un usager situé à côté de toi."
    ], "Retiens la suite **observer → annoncer → manœuvrer**. Le clignotant informe les autres ; tes contrôles servent à vérifier que la manœuvre est réellement possible.", [['girar', 'tourner'], ['intermitent', 'clignotant'], ['angle mort', 'angle mort']], ['Abans de + infinitif', "Abans de suivi d’un infinitif signifie « avant de ». Dans abans de girar, hem de mirar, on regarde d’abord, puis on tourne. Després de indique au contraire ce qui vient après.", 'Abans de girar, hem de mirar.', 'Avant de tourner, nous devons regarder.']),
    page('Insertion, demi-tour, marche arrière', 'LA PLACE DOIT ÊTRE LIBRE', [
      "Quand tu t’insères sur une route, **cède le passage aux véhicules qui y circulent déjà**. Tu dois choisir un espace qui permet d’entrer sans les obliger à réagir brusquement.",
      "Le **carril d’acceleració** est la voie d’accélération. Elle sert à adapter ta vitesse avant l’insertion ; tu dois aussi signaler ton intention et vérifier l’espace disponible.",
      "Le **carril de desacceleració** est la voie de décélération. Elle facilite la sortie de la route et la réduction de vitesse pour rejoindre la voie de sortie.",
      "Un demi-tour exige une manœuvre **autorisée, bien visible et sans danger**. Il est interdit dans un virage sans visibilité ou dans un tunnel, sauf autorisation expresse pour ce dernier.",
      "La marche arrière sert à effectuer une **manœuvre nécessaire sur la distance minimale**. Elle ne remplace pas la circulation normale lorsque tu as manqué ta direction.",
      "Avant de reculer, vérifie que l’espace est libre. Si une personne approche et qu’il existe un risque, **arrête immédiatement la manœuvre** au lieu d’essayer de la finir vite."
    ], "Si tu n’as plus assez de place ou de visibilité, **renonce à la manœuvre**. Les feux de détresse n’effacent ni le danger ni une interdiction.", [['incorporar-se', 's’insérer'], ['marxa enrere', 'marche arrière'], ['sentit contrari', 'sens opposé']], ['Només / llevat de', "Només signifie « seulement » : il réduit ce qui est permis. Llevat de signifie « sauf » et introduit une exception. Repère ces mots avant de conclure qu’une action est toujours autorisée.", 'Fem marxa enrere només el mínim indispensable.', 'Nous reculons seulement du minimum indispensable.'])
  ], [
    [
      ['Quan hem de regular el seient i els retrovisors?', 'Abans d’iniciar la marxa.', 'Mentre girem.', 'Només després d’un accident.', 'Les réglages se font avant le départ.'],
      ['Abans de girar, quina circulació hem d’observar?', 'La del davant, del darrere i dels costats.', 'Només la del davant.', 'Només els vehicles estacionats.', 'Observer toutes les directions concernées.'],
      ['L’intermitent dona prioritat?', 'No, només anuncia la intenció.', 'Sí, sempre.', 'Sí, si l’encenem aviat.', 'Annoncer ne donne aucun droit de passage supplémentaire.'],
      ['Quan hem de senyalitzar un gir?', 'Amb antelació suficient.', 'Només després de girar.', 'Quan ja hem ocupat l’altre carril.', 'Antelació = à l’avance.'],
      ['Què hem de comprovar dels vehicles que s’apropen?', 'La velocitat i la distància.', 'Només el color.', 'Només la marca.', 'Vitesse + distance permettent d’évaluer la marge.'],
      ['Què vol dir fer un canvi de sentit?', 'Tornar en sentit contrari.', 'Girar una mica el volant sense canviar de sentit.', 'Canviar de marxa.', 'Canvi de sentit = demi-tour, pas changement de rapport.'],
      ['Què és un angle mort?', 'Una zona que no veiem als retrovisors.', 'Un carril reservat.', 'Un senyal de prohibició.', 'Les rétroviseurs ne montrent pas tout.']
    ], [
      ['En incorporar-nos, a qui hem de cedir el pas?', 'Als vehicles que ja circulen per la via.', 'Només als que toquen el clàxon.', 'A ningú si tenim l’intermitent encès.', 'Les véhicules déjà sur la voie passent d’abord.'],
      ['Per a què serveix el carril d’acceleració?', 'Per adaptar la velocitat abans d’incorporar-nos.', 'Per estacionar.', 'Per donar-nos prioritat automàtica.', 'Il facilite l’insertion, sans donner la priorité.'],
      ['Quin carril facilita la sortida i la reducció de velocitat?', 'El carril de desacceleració.', 'El carril d’acceleració.', 'El carril del sentit contrari.', 'Desacceleració = décélération.'],
      ['Sense autorització expressa, podem fer un canvi de sentit en un túnel?', 'No.', 'Sí, si és de dia.', 'Sí, si el túnel està il·luminat.', 'Le tunnel interdit cette manœuvre sauf autorisation expresse.'],
      ['Podem fer un canvi de sentit en un revolt sense visibilitat?', 'No.', 'Sí, amb els llums d’emergència.', 'Sí, si anem molt de pressa.', 'La visibilité suffisante est indispensable.'],
      ['En una maniobra necessària, quina distància hem de recórrer marxa enrere?', 'La mínima indispensable.', 'Sempre cinquanta metres.', 'Qualsevol distància.', 'Mínima indispensable = strict minimum.'],
      ['Una persona s’apropa mentre fem marxa enrere. Què cal fer si hi ha risc?', 'Aturar-nos immediatament.', 'Continuar sense mirar.', 'Accelerar per acabar abans.', 'La sécurité impose d’interrompre la manœuvre.']
    ]
  ]),
  theme('depassements', 'Dépasser sans danger', '🚙', 'amber', 'La visibilité avant la vitesse.', ['OVERTAKING', 'BICYCLE', 'ATTITUDE'], ['926', '920', '921', '1447'], 'Synthèse p. 9 · QCM p. 3–6', '26, 27, 28', [
    page('Préparer un dépassement', 'VOIR LOIN · GARDER UNE ISSUE', [
      "En règle générale, tu dépasses **par la gauche** du véhicule devant toi. Les possibilités de dépassement par la droite correspondent à des situations particulières.",
      "Avant de commencer, vérifie **la route devant, les véhicules derrière, le sens opposé et la signalisation**. Aucun de ces contrôles ne remplace les autres.",
      "Il faut assez d’espace pour **dépasser puis revenir à droite sans gêner**. Voir une place pour se décaler ne suffit pas : tu dois prévoir toute la manœuvre.",
      "Un virage, un sommet ou du brouillard peuvent cacher un véhicule en face. Ne t’engage pas sur le sens opposé **sans visibilité suffisante** pour dépasser.",
      "Avant de te décaler, vérifie qu’un véhicule **n’a pas déjà commencé à te dépasser**, puis signale ton intention. Ton clignotant ne l’oblige pas à te laisser passer.",
      "Si la situation change et que le dépassement n’est plus sûr, **renonce à le poursuivre**. L’objectif est de garder une marge de sécurité, pas de terminer à tout prix."
    ], "Imagine la manœuvre jusqu’au bout : **sortir de ma file → passer le véhicule → retrouver ma place**. Si tu ne peux pas prévoir la dernière étape en sécurité, attends.", [['avançar', 'dépasser un véhicule'], ['canvi de rasant', 'sommet / changement de pente'], ['visibilitat', 'visibilité']], ['Hem de / podem', "Hem de signifie « nous devons » : c’est une obligation. Podem signifie « nous pouvons » : c’est une possibilité. Vérifier la visibilité est obligatoire avant d’envisager un dépassement.", 'Abans d’avançar, hem de comprovar la visibilitat.', 'Avant de dépasser, nous devons vérifier la visibilité.']),
    page('Pendant et après la manœuvre', 'NE PAS SERRER · NE PAS FORCER', [
      "Si un autre véhicule te dépasse, **n’accélère pas**. Facilite son passage afin qu’il puisse terminer la manœuvre et revenir à droite en sécurité.",
      "Avant de te rabattre, laisse devant le véhicule dépassé un espace d’au moins **deux fois sa longueur**. Tu évites ainsi de revenir trop près de son avant.",
      "Ne dépasse pas un véhicule **arrêté pour laisser traverser des piétons**. Il peut masquer une personne qui continue sa traversée devant lui.",
      "Hors agglomération, garde **au moins 1,5 m d’écart latéral** pour dépasser un vélo ou un deux-roues. Si la largeur disponible ne le permet pas, attends.",
      "En ville, dépasser par la droite peut être possible lorsqu’il y a **au moins deux voies dans le même sens**. La manœuvre doit toujours pouvoir se faire sans danger.",
      "**Avançar** signifie dépasser un véhicule ; **sobresortir** décrit quelque chose qui dépasse du gabarit. Par exemple, un bagage peut dépasser du véhicule sans effectuer un dépassement routier."
    ], "Distingue les deux espaces : **sur le côté**, tu laisses de la place au deux-roues ; **devant le véhicule dépassé**, tu gardes une marge avant de revenir à droite.", [['vehicle avançat', 'véhicule dépassé'], ['llargada', 'longueur'], ['separació lateral', 'écart latéral']], ['Almenys / com a mínim', "Almenys et com a mínim signifient tous deux « au moins ». Le nombre donne un minimum : almenys dos carrils veut dire deux voies ou davantage, jamais une seule.", 'Calen almenys dos carrils en el mateix sentit.', 'Il faut au moins deux voies dans le même sens.'])
  ], [
    [
      ['Per quin costat s’avança com a norma general?', 'Per l’esquerra.', 'Per la dreta.', 'Pel voral.', 'La règle générale est le dépassement par la gauche.'],
      ['Abans d’avançar, cal observar els vehicles del darrere?', 'Sí.', 'No, només els del davant.', 'Només de nit.', 'Un véhicule peut être déjà en train de te dépasser.'],
      ['Quin espai hem de preveure abans d’avançar?', 'El necessari per passar i tornar sense perill.', 'Només l’espai al costat del vehicle.', 'Només la llargada del nostre vehicle.', 'Il faut prévoir toute la manœuvre, retour compris.'],
      ['Podem envair el sentit contrari sense visibilitat suficient per avançar?', 'No.', 'Sí, amb intermitent.', 'Sí, si el vehicle és lent.', 'Sans visibilité, le risque en face ne peut pas être évalué.'],
      ['Un vehicle del darrere ja ens està avançant. Hem de començar un desplaçament lateral per avançar?', 'No, hem d’esperar.', 'Sí, tenim prioritat.', 'Sí, si accelerem.', 'On ne coupe pas la trajectoire du véhicule qui dépasse.'],
      ['La maniobra prevista deixa de ser segura. Què hem de fer?', 'Renunciar a l’avançament.', 'Acabar-la a qualsevol preu.', 'Tocar el clàxon i continuar.', 'Renoncer est la bonne décision si les conditions changent.'],
      ['Què expressa «hem de comprovar»?', 'Una obligació de comprovar.', 'Una prohibició de comprovar.', 'Una acció ja acabada.', 'Hem de = nous devons.']
    ], [
      ['Quan ens avancen, podem accelerar per impedir la maniobra?', 'No.', 'Sí, sempre.', 'Sí, si anem per sota del límit.', 'Ne pas rendre le dépassement plus difficile.'],
      ['Abans de tornar a la dreta, quina separació mínima deixem?', 'El doble de la llargada del vehicle avançat.', 'Un metre.', 'La meitat de la llargada del vehicle avançat.', 'Le repère du Code porte sur la longueur du véhicule dépassé.'],
      ['Un vehicle s’ha aturat per deixar passar vianants. El podem avançar?', 'No.', 'Sí, si no veiem ningú.', 'Sí, per qualsevol costat.', 'Un piéton peut être caché par le véhicule arrêté.'],
      ['No hi ha espai per deixar una separació segura amb una bicicleta. Què fem?', 'Esperar.', 'Passar fregant-la.', 'Obligar-la a pujar a la vorera.', 'La sécurité latérale compte davantage que la rapidité.'],
      ['Dins de poblat, quan es pot avançar per la dreta segons l’excepció estudiada?', 'Amb almenys dos carrils en el mateix sentit i sense perill.', 'Sempre que hi hagi un voral.', 'En qualsevol carrer de doble sentit.', 'Il faut réunir les conditions de cette exception.'],
      ['Què significa «almenys dos carrils»?', 'Dos carrils o més.', 'Només un carril.', 'Menys de dos carrils.', 'Almenys = au moins : 2 est inclus.'],
      ['Fora de poblat, quina separació lateral mínima cal deixar en avançar una bicicleta?', '1,5 metres.', '1 metre.', '0,5 metres.', 'Le Code actuel impose au moins 1,5 m hors agglomération pour dépasser un vélo ou deux-roues.']
    ]
  ]),
  theme('stationnement', 'Arrêt & stationnement', '🅿️', 'blue', 'Trois mots. Des situations différentes.', ['PARKING', 'STOPPING'], ['1154', '1180', '919', '1266'], 'Synthèse p. 9 · QCM p. 9–10', '3, 29, 30, 31, 32, 33', [
    page('Parada, estacionament, detenció', 'VOLONTAIRE OU IMPOSÉ ?', [
      "Une **parada** est un arrêt volontaire pour faire monter ou descendre quelqu’un, ou pour charger ou décharger. Le véhicule s’immobilise pour réaliser cette opération.",
      "Un **estacionament** est un stationnement volontaire qui ne correspond pas à ces opérations. Tu laisses par exemple ta voiture garée pendant que tu fais autre chose.",
      "Une **detenció** est une immobilisation imposée par la circulation, une panne ou une urgence. Tu t’arrêtes parce que la situation t’y oblige, pas pour déposer quelqu’un.",
      "Au feu rouge ou dans un embouteillage, pense **detenció**. Si tu t’arrêtes pour déposer un passager, pense **parada** : c’est la raison de l’arrêt qui change le mot.",
      "Place normalement le véhicule **du côté droit**. En ville, dans une rue à sens unique, tu peux aussi te placer à gauche si l’emplacement et la signalisation le permettent.",
      "Même pour une courte immobilisation, ne crée **ni danger ni obstacle**. Vérifie que les autres usagers peuvent te voir et continuer à circuler en sécurité."
    ], "Pour choisir le bon mot catalan, demande-toi **« pourquoi la voiture est-elle arrêtée ? »**. Le seul mot français « arrêt » ne permet pas de distinguer ces trois situations.", [['aturat', 'arrêté'], ['aparcament', 'parking / stationnement'], ['sentit únic', 'sens unique']], ['També / tampoc', "També signifie « aussi » dans une phrase affirmative. Tampoc signifie « non plus » dans une phrase négative. Dans l’exemple, també ajoute le côté gauche aux possibilités déjà indiquées.", 'En una via urbana de sentit únic, també a l’esquerra.', 'Dans une rue à sens unique, aussi à gauche.']),
    page('Choisir et quitter sa place', 'VISIBILITÉ · FREIN · CONTRÔLE', [
      "Ne t’arrête pas et ne stationne pas **sur un passage piéton, dans un tunnel ou à un endroit sans visibilité**. Ton véhicule pourrait masquer un danger ou en créer un.",
      "Ne stationne pas sur une **place réservée aux transports publics**. Même si elle paraît libre, elle doit rester disponible pour l’usage auquel elle est destinée.",
      "Sur la voie publique, le stationnement au même emplacement est limité à **15 jours consécutifs maximum**. Vérifie aussi les restrictions locales, qui peuvent imposer une durée plus courte.",
      "Avec une boîte manuelle, serre le **frein de stationnement** en pente. Engage aussi la **première en montée** ou la **marche arrière en descente** pour immobiliser le véhicule.",
      "Avant d’ouvrir une porte, vérifie l’arrivée de **piétons, de cyclistes et de véhicules**. Une portière ouverte brusquement peut couper leur trajectoire.",
      "Pour quitter ta place, **observe, signale ton intention et cède le passage**. Les véhicules déjà en circulation ne doivent pas être surpris par ton départ."
    ], "Une place doit être sûre **quand tu arrives, pendant le stationnement et quand tu repars**. Les feux de détresse ne rendent pas autorisé un emplacement interdit.", [['pujada / baixada', 'montée / descente'], ['fre d’estacionament', 'frein de stationnement'], ['romandre', 'rester']], ['No es pot + infinitif', "No es pot suivi d’un infinitif signifie « on ne peut pas ». Dans une règle de stationnement, cela exprime une interdiction : no es pot estacionar veut dire qu’on n’a pas le droit d’y stationner.", 'No es pot estacionar en un túnel.', 'On ne peut pas stationner dans un tunnel.'])
  ], [
    [
      ['Ens immobilitzem per un semàfor vermell. Què és?', 'Una detenció.', 'Un estacionament voluntari.', 'Una operació de càrrega.', 'Le feu impose l’immobilisation : detenció.'],
      ['Ens aturem per deixar baixar un passatger. Què és?', 'Una parada.', 'Una detenció per avaria.', 'Un avançament.', 'Déposer un passager correspond à parada.'],
      ['Deixem el vehicle aparcat mentre fem una visita. Què és?', 'Un estacionament.', 'Una parada per descarregar.', 'Una incorporació.', 'Le véhicule est stationné, hors chargement ou déchargement.'],
      ['Una avaria ens obliga a immobilitzar el vehicle. Quin terme correspon?', 'Detenció.', 'Avançament.', 'Canvi de sentit.', 'L’immobilisation est imposée par la panne.'],
      ['En una calçada de doble sentit, a quin costat parem normalment?', 'Al dret.', 'A l’esquerre.', 'Al centre.', 'Double sens : à droite.'],
      ['En una via urbana de sentit únic, podem estacionar a l’esquerra si el lloc ho permet?', 'Sí, també a l’esquerra.', 'No, mai.', 'Només al centre.', 'Le sens unique urbain permet aussi le côté gauche.'],
      ['Podem parar si això crea un perill per als altres?', 'No.', 'Sí, si és poca estona.', 'Sí, amb els llums d’emergència.', 'Même un arrêt bref ne doit pas créer de danger.']
    ], [
      ['Es pot estacionar en un túnel?', 'No.', 'Sí, amb els llums de posició.', 'Sí, de dia.', 'Le stationnement en tunnel est interdit.'],
      ['Podem estacionar en una parada reservada al transport públic?', 'No.', 'Sí, si no hi ha cap autobús.', 'Sí, durant tota la nit.', 'Un emplacement réservé n’est pas une place libre pour les autres.'],
      ['Sense una restricció local més curta, quin màxim continuat regeix al mateix lloc de la via pública?', '15 dies.', '7 dies.', '30 dies.', 'Le Code retient 15 jours ; l’ancien mémo de 7 jours n’est pas repris.'],
      ['En pujada, amb canvi manual, què afegim al fre d’estacionament?', 'La primera marxa engranada.', 'El punt mort.', 'Els llums de carretera.', 'Montée : première engagée, avec frein de stationnement.'],
      ['En baixada, amb canvi manual, quina marxa deixem amb el fre d’estacionament?', 'La marxa enrere.', 'El punt mort.', 'La tercera marxa.', 'Descente : marche arrière engagée.'],
      ['Abans d’obrir una porta, què hem de comprovar?', 'Que no posem en perill altres usuaris.', 'Només si el motor està calent.', 'Només l’hora.', 'Attention notamment aux cyclistes qui arrivent.'],
      ['En sortir d’un estacionament, què cal fer?', 'Observar, senyalitzar i cedir el pas.', 'Entrar sense mirar.', 'Confiar que l’intermitent ens dona prioritat.', 'Repartir est une insertion : observer et céder.']
    ]
  ]),
  theme('eclairage', 'Éclairage & tunnels', '💡', 'violet', 'Voir et être vu, sans éblouir.', ['LIGHTS', 'TUNNEL', 'SIGNALING'], ['951', '931', '1232', '1531'], 'Synthèse p. 4–5, 11 · QCM p. 5–6', '73, 75, 76, 77, 78', [
    page('Reconnaître les feux dans le texte', 'POSICIÓ · ENCREUAMENT · CARRETERA', [
      "Les **feux de position** servent surtout à rendre le véhicule visible aux autres. Ils ne sont pas conçus pour éclairer suffisamment loin devant toi.",
      "Les **llums d’encreuament** sont les feux de croisement. Les **llums de carretera** sont les feux de route : ils éclairent plus loin, mais peuvent éblouir les autres usagers.",
      "Dès que tes feux de route risquent d’éblouir quelqu’un, **repasse en feux de croisement**. Tu dois le faire même si l’autre conducteur ne change pas ses propres feux.",
      "N’utilise pas les **feux de route lorsque le véhicule est arrêté ou stationné**. Leur puissance peut gêner les autres alors que tu n’as pas besoin d’éclairer loin pour avancer.",
      "Le **feu de marche arrière** est blanc et placé à l’arrière. Les feux stop sont rouges et brillent plus fortement que les feux de position pour annoncer le freinage.",
      "Les **intermitents** sont les clignotants. Allume-les assez tôt pour annoncer une manœuvre, puis éteins-les une fois celle-ci terminée pour ne pas tromper les autres."
    ], "Retiens deux fonctions : **être vu** avec les feux de position, et **voir la route** avec les feux adaptés. Dans llums d’encreuament, le mot croisement désigne bien un type de feux.", [['enllumenat', 'éclairage'], ['enlluernar', 'éblouir'], ['encendre / apagar', 'allumer / éteindre']], ['Per + infinitif', "Per suivi d’un infinitif signifie « pour » et explique le but. Dans per fer visible el vehicle, on explique à quoi servent les feux : à rendre le véhicule visible.", 'Els llums de posició serveixen per fer visible el vehicle.', 'Les feux de position servent à rendre le véhicule visible.']),
    page('Choisir selon la situation', 'TUNNEL = CROISEMENT, MÊME DE JOUR', [
      "Dans un tunnel, allume **au minimum les feux de croisement**. Cette obligation reste valable en plein jour et lorsque le tunnel possède son propre éclairage.",
      "À moto, les **feux de croisement doivent être allumés de jour comme de nuit**. Ne réserve donc pas leur utilisation aux seuls moments où il fait sombre.",
      "Le **feu antibrouillard arrière** s’utilise dans des conditions particulièrement défavorables. Une petite pluie ne suffit pas à justifier son utilisation.",
      "La nuit, adapte ta vitesse pour pouvoir t’arrêter **dans la zone éclairée que tu vois**. Tu dois conserver assez de distance pour réagir à un obstacle qui y apparaît.",
      "Si tu es ébloui, **ralentis pour retrouver une marge de sécurité**. Arrête-toi si nécessaire lorsque tu ne peux plus continuer à conduire en sécurité.",
      "À l’entrée d’un tunnel, respecte les **feux, les panneaux et les instructions**. Un feu rouge interdit l’entrée, même si tes propres feux sont allumés."
    ], "L’éclairage d’un tunnel éclaire l’endroit ; **tes feux rendent aussi ton véhicule visible**. La présence de lampes dans le tunnel ne remplace donc pas tes feux de croisement.", [['boira', 'brouillard'], ['de dia / de nit', 'de jour / de nuit'], ['si cal', 'si nécessaire']], ['Encara que / també', "Encara que signifie « même si » : la circonstance annoncée ne supprime pas l’obligation. També signifie « aussi » et ajoute une situation dans laquelle la règle s’applique.", 'Cal encendre els llums encara que el túnel estigui il·luminat.', 'Il faut allumer les feux même si le tunnel est éclairé.'])
  ], [
    [
      ['Quina és la funció principal dels llums de posició?', 'Fer visible el vehicle.', 'Il·luminar molt lluny.', 'Indicar un canvi de sentit.', 'Position = être vu.'],
      ['Quins són els llums d’encreuament?', 'Els que fem servir per no enlluernar en creuar-nos.', 'Els llums blancs de marxa enrere.', 'Els indicadors de direcció.', 'Encreuament désigne ici les feux de croisement.'],
      ['Podem enlluernar un vehicle amb els llums de carretera. Què fem?', 'Passem als d’encreuament.', 'Mantenim els de carretera.', 'Apaguem tots els llums.', 'On passe en croisement dès qu’il y a un risque d’éblouissement.'],
      ['L’altre conductor manté els llums de carretera. Podem enlluernar-lo també?', 'No.', 'Sí, per obligar-lo a canviar.', 'Sí, si anem més lentament.', 'La conduite de l’autre ne supprime pas ton obligation.'],
      ['Podem deixar els llums de carretera amb el vehicle estacionat?', 'No.', 'Sí, sempre de nit.', 'Sí, si no hi ha vorera.', 'Feux de route interdits à l’arrêt ou en stationnement.'],
      ['De quin color és el llum de marxa enrere?', 'Blanc.', 'Vermell.', 'Blau.', 'Le feu de marche arrière est blanc.'],
      ['Quan s’ha d’apagar l’intermitent?', 'Quan acaba la maniobra.', 'Abans de començar a girar.', 'Mai durant el trajecte.', 'Le clignotant doit correspondre à la manœuvre réelle.']
    ], [
      ['Entrem de dia en un túnel il·luminat. Quins llums calen com a mínim?', 'Els d’encreuament.', 'Cap llum.', 'Només els de posició.', 'Tunnel : croisement, même éclairé et de jour.'],
      ['Quin enllumenat ha de portar una motocicleta de dia?', 'Els llums d’encreuament.', 'Només els de posició.', 'Cap si fa sol.', 'Moto : croisement aussi pendant la journée.'],
      ['Una pluja lleugera justifica sempre el llum de boira posterior?', 'No.', 'Sí.', 'Només dins de poblat.', 'L’antibrouillard arrière exige des conditions particulièrement défavorables.'],
      ['Quan utilitzem el llum de boira posterior?', 'En condicions especialment adverses.', 'Cada nit.', 'Sempre que hi ha un núvol.', 'Ce feu intense sert aux conditions très dégradées.'],
      ['De nit, hem de poder aturar-nos…', 'Dins de la zona il·luminada que veiem.', 'Més enllà de la zona visible.', 'Només si portem llums de carretera.', 'La vitesse doit rester compatible avec la distance visible.'],
      ['Si quedem enlluernats, què hem de fer?', 'Reduir la velocitat i aturar-nos si cal.', 'Accelerar.', 'Mirar fixament els fars.', 'Ralentir ; si nécessaire, s’arrêter en sécurité.'],
      ['El semàfor d’entrada d’un túnel és vermell. Podem entrar amb el nostre turisme?', 'No.', 'Sí, si portem llums.', 'Sí, si és de dia.', 'Le feu rouge d’entrée interdit le passage ordinaire.']
    ]
  ]),
  theme('meteo', 'Pluie, neige & montagne', '🌧️', 'blue', 'Moins d’adhérence, plus de marge.', ['WEATHER', 'DISTANCE', 'SPEED'], ['930', '1144', '1130', '927'], 'Synthèse p. 11–12 · QCM p. 5–6', '6, 10, 72', [
    page('Pluie, brouillard et vent', 'RALENTIR + ESPACER + ADOUCIR', [
      "Sous la pluie, les pneus ont **moins d’adhérence** et tu vois moins bien. Le freinage peut demander davantage de distance : réduis ta vitesse et garde plus d’espace devant toi.",
      "Méfie-toi particulièrement des **premières gouttes de pluie**. La chaussée peut devenir très glissante dès le début de l’averse, même si elle n’est pas encore couverte d’eau.",
      "L’**aquaplaning** apparaît quand le pneu n’évacue plus suffisamment l’eau. Une couche d’eau lui fait perdre le contact avec la chaussée, ce qui compromet le contrôle du véhicule.",
      "Quand il y a de l’eau sur la route, réduis l’allure et agis **avec douceur sur le volant et les pédales**. Évite les freinages brusques et les changements soudains de direction.",
      "Dans le brouillard, roule assez lentement pour pouvoir t’arrêter **dans la zone visible**. Ne colle pas le véhicule devant pour suivre ses feux : garde ta distance de sécurité.",
      "Par vent latéral, tiens fermement le volant. En sortant d’une zone abritée, le vent peut brusquement pousser le véhicule et **modifier sa trajectoire**."
    ], "Retiens **ralentir, espacer, adoucir** : moins de vitesse, plus d’espace, des gestes plus doux. Pour le vocabulaire, PLUJA rappelle PLUIE ; imagine une « bouillie » de brouillard pour BOIRA.", [['pluja', 'pluie'], ['moll / eixut', 'mouillé / sec'], ['vent lateral', 'vent de côté']], ['Menys… més…', "Menys signifie « moins » et més signifie « plus ». Une même situation peut produire deux effets opposés : avec la pluie, l’adhérence diminue tandis que la distance de freinage augmente.", 'Amb pluja, menys adherència i més distància de frenada.', 'Avec la pluie, moins d’adhérence et plus de distance de freinage.']),
    page('Neige, verglas et descente', 'DOUCEUR AVANT TOUT', [
      "**Neu** signifie neige et **gel** signifie glace ou verglas. Ces surfaces réduisent fortement l’adhérence : ralentis et laisse beaucoup plus de distance avec le véhicule devant.",
      "Sur un sol glissant, **accélère, tourne et freine en douceur**. Des actions brusques sur les commandes peuvent faire perdre aux pneus leur adhérence.",
      "Prépare ta vitesse **avant d’entrer dans un virage**. N’attends pas d’être au milieu pour découvrir que ton allure est trop élevée pour la courbe.",
      "En descente, garde un **rapport adapté pour utiliser le frein moteur**. Au point mort, cette aide au ralentissement disparaît : ne descends donc pas ainsi.",
      "Du **1er novembre au 15 mai**, tu dois emporter des chaînes prêtes à servir, sauf si le véhicule est équipé de pneus hiver ou M+S. Le beau temps du jour ne supprime pas ce repère saisonnier.",
      "Sur chaussée enneigée ou verglacée, utilise les équipements adaptés aux conditions et aux consignes. En revanche, **les chaînes sont interdites sur une chaussée dégagée de neige et de glace**."
    ], "Distingue **emporter des chaînes** et **les monter sur les pneus**. Elles doivent être disponibles pendant la période prévue, mais on ne roule pas avec des chaînes sur une route dégagée. GEL rappelle le gel français ; BAIXADA fait penser au bas d’une descente.", [['neu / gel', 'neige / verglas'], ['cadenes', 'chaînes'], ['punt mort', 'point mort']], ['Llevat que…', "Llevat que signifie « sauf si » et introduit l’exception à la règle. Dans l’exemple, les pneus hiver ou M+S expliquent dans quel cas l’obligation d’emporter des chaînes ne s’applique pas.", 'Cal portar cadenes, llevat que portem pneumàtics d’hivern o M+S.', 'Il faut emporter des chaînes, sauf si l’on a des pneus hiver ou M+S.'])
  ], [
    [
      ['Amb pluja, què passa normalment amb l’adherència?', 'Disminueix.', 'Augmenta sempre.', 'No canvia mai.', 'Pluie = adhérence réduite.'],
      ['Per què cal vigilar especialment les primeres gotes?', 'Perquè la calçada pot ser molt lliscant.', 'Perquè els frens deixen de ser necessaris.', 'Perquè augmenta l’adherència.', 'Les premières gouttes peuvent rendre la chaussée très glissante.'],
      ['Què passa en l’aquaplaning?', 'El pneumàtic perd contacte amb el paviment per l’aigua.', 'El motor es refreda massa.', 'El vehicle frena millor.', 'Une couche d’eau empêche le bon contact pneu-sol.'],
      ['Amb aigua a la calçada, quina conducció és adequada?', 'Suau i amb velocitat reduïda.', 'Amb frenades brusques.', 'Amb girs sobtats.', 'Les gestes doux limitent les pertes d’adhérence.'],
      ['Amb boira, és segur acostar-nos molt al vehicle del davant per seguir-lo?', 'No, cal mantenir més distància.', 'Sí, sempre.', 'Sí, si té els llums encesos.', 'Suivre de trop près retire la marge de sécurité.'],
      ['Amb vent lateral fort, què pot passar en sortir d’un tram protegit?', 'Que canviï la trajectòria del vehicle.', 'Que desaparegui el vent.', 'Que millori sempre l’estabilitat.', 'Le vent peut pousser brusquement le véhicule en sortie de zone abritée.'],
      ['Quina calçada és «molla»?', 'La que està mullada.', 'La que està seca.', 'La que està tancada.', 'Moll/molla = mouillé/mouillée.']
    ], [
      ['Amb neu o gel, com adaptem la distància de seguretat?', 'L’augmentem.', 'La reduïm.', 'La mantenim sempre igual.', 'Sol très glissant : beaucoup plus de marge.'],
      ['Sobre gel, com hem d’actuar sobre els comandaments?', 'Amb suavitat.', 'Bruscament.', 'Sempre a fons.', 'Douceur au volant, à l’accélérateur et au frein.'],
      ['Quan convé reduir la velocitat per prendre una corba?', 'Abans d’entrar-hi.', 'Només al mig.', 'Només després de sortir-ne.', 'On prépare l’allure avant le virage.'],
      ['En una baixada, és correcte circular en punt mort?', 'No, cal conservar el fre motor amb una marxa adequada.', 'Sí, per estalviar sempre.', 'Sí, si la baixada és llarga.', 'Le point mort supprime le frein moteur.'],
      ['De l’1 de novembre al 15 de maig, sense pneumàtics d’hivern ni M+S, què cal portar?', 'Cadenes preparades per utilitzar.', 'Només una pala.', 'Res si avui fa sol.', 'Les chaînes doivent être prêtes à servir sur cette période.'],
      ['Podem utilitzar cadenes amb la calçada neta de neu i gel?', 'No.', 'Sí, sempre.', 'Sí, només en ciutat.', 'Les chaînes sont interdites sur chaussée dégagée de neige et de glace.'],
      ['Quin mot significa neu en estat de gel sobre la via?', 'Gel.', 'Vent.', 'Boira.', 'Gel = glace / verglas, comme le mot français gel.']
    ]
  ]),
  theme('vigilance', 'Vigilance & alcool', '🧠', 'rose', 'Un conducteur prêt à réagir.', ['ALCOHOL', 'FATIGUE', 'ATTITUDE', 'SAFETY'], ['922', '937', '1124', '921'], 'Synthèse p. 5–7 · QCM p. 7–8', '4, 79, 80, 81, 82', [
    page('Reconnaître quand faire une pause', 'FATIGUE = RÉACTION PLUS LENTE', [
      "La fatigue, la somnolence ou la maladie peuvent **réduire ton attention et ralentir tes réactions**. Tu risques alors de repérer un danger plus tard et de freiner trop tard.",
      "Des bâillements ou des paupières lourdes signalent un besoin de repos. Cherche un **endroit sûr pour t’arrêter et te reposer**, au lieu d’attendre de ne plus pouvoir rester éveillé.",
      "Ouvrir la fenêtre ou monter la musique **ne remplace pas le repos**. Ces gestes ne doivent pas servir de raison pour continuer malgré la somnolence.",
      "Regarder un téléphone détourne ton regard et ton attention de la route. Pendant ce temps, tu peux **manquer l’apparition d’un danger** et réagir trop tard.",
      "Avant de conduire avec un médicament nouveau, **lis les avertissements et demande conseil**. Ne suppose pas qu’il est sans effet sur la vigilance simplement parce qu’il est prescrit.",
      "Une conduite prévisible aide les autres à anticiper. **Annonce tes manœuvres et garde une marge**, sans changer brusquement de trajectoire ni freiner pour surprendre quelqu’un."
    ], "Le bon réflexe face à la somnolence est **de s’arrêter pour se reposer**, pas de chercher à tenir encore. SON signifie sommeil, pas un bruit ; CANSAMENT désigne la fatigue.", [['cansament', 'fatigue'], ['son', 'sommeil / somnolence'], ['descansar', 'se reposer']], ['Tenir son', "Tenir signifie « avoir ». Tinc est la forme « j’ai » : tinc son veut donc dire « j’ai sommeil ». Dans he de parar, he de ajoute l’obligation : « je dois m’arrêter ».", 'Si tinc son, he de parar en un lloc segur.', 'Si j’ai sommeil, je dois m’arrêter dans un endroit sûr.']),
    page('Alcool : les bons repères', '0,5 g/l · CATÉGORIES À 0,0 g/l', [
      "La limite générale est de **0,5 gramme d’alcool par litre de sang**. Ce nombre est un plafond réglementaire, pas une quantité qu’il serait conseillé d’atteindre avant de conduire.",
      "Certaines catégories sont soumises à **0,0 g/l** : notamment les urgences, le transport de passagers, les marchandises de plus de 3 500 kg, les matières dangereuses et les véhicules spéciaux.",
      "**Même une petite dose d’alcool peut dégrader la conduite**. Pour éviter ce risque, le choix le plus sûr consiste à ne pas boire d’alcool avant de prendre le volant.",
      "Ne retiens pas **0,8 g/l comme limite générale autorisée** : ce serait le mauvais repère. Pour la règle générale étudiée ici, le nombre à reconnaître est bien 0,5 g/l.",
      "Après un accident, un contrôle peut concerner **tout usager impliqué**. Il ne se limite pas automatiquement au conducteur que l’on suppose responsable de l’accident.",
      "Si le résultat de l’éthylomètre est contesté, une **analyse de sang de contrôle peut être demandée**. La contestation ne fait pas disparaître automatiquement le premier résultat."
    ], "Lis le **type de conducteur ou de transport** avant de choisir le taux. Pour les mots : SANG s’écrit comme en français et TAXA signifie « taux », pas « taxe à payer ».", [['taxa', 'taux'], ['prova', 'test / épreuve'], ['qualsevol', 'n’importe quel / tout']], ['No superior a…', "No superior a signifie « ne dépassant pas ». Le nombre est une limite maximale : la formule n’autorise pas à dépasser cette valeur, même légèrement.", 'Una taxa no superior a 0,5 g/l.', 'Un taux ne dépassant pas 0,5 g/l.'])
  ], [
    [
      ['Quin efecte pot tenir la fatiga en la conducció?', 'Reduir l’atenció.', 'Millorar els reflexos.', 'Fer innecessàries les pauses.', 'La fatigue diminue la vigilance.'],
      ['Tenim son al volant. Què hem de fer?', 'Buscar un lloc segur i descansar.', 'Pujar la música i continuar sempre.', 'Accelerar per arribar abans.', 'Le repos dans un endroit sûr est la réponse adaptée.'],
      ['Obrir la finestra substitueix el descans?', 'No.', 'Sí, sempre.', 'Sí, de nit.', 'L’air frais ne remplace pas le sommeil.'],
      ['Mirar el telèfon mentre conduïm pot…', 'Retardar la detecció d’un perill.', 'Millorar l’atenció a la carretera.', 'Reduir el temps de reacció sempre.', 'La distraction retarde la perception et la réaction.'],
      ['Abans de conduir amb un medicament nou, què convé fer?', 'Llegir les advertències i demanar consell.', 'Suposar que mai afecta la conducció.', 'Prendre’n més per estar despert.', 'Vérifier les effets possibles sur la conduite.'],
      ['Quina conducta ajuda els altres usuaris?', 'Anunciar les maniobres amb temps.', 'Canviar de trajectòria sense avisar.', 'Frenar per sorprendre’ls.', 'Une conduite prévisible aide chacun à anticiper.'],
      ['Què significa «tinc son»?', 'Necessito dormir.', 'Tinc molta pressa.', 'Sento un soroll.', 'Son = sommeil ; ce n’est pas le son entendu.']
    ], [
      ['Quina és la taxa màxima general d’alcohol a la sang?', '0,5 g/l.', '0,8 g/l.', '1,0 g/l.', 'Le seuil général est 0,5 g/l de sang.'],
      ['Quina taxa s’aplica a les categories sotmeses a taxa zero?', '0,0 g/l.', '0,5 g/l.', '0,8 g/l.', 'Les catégories visées sont soumises à 0,0 g/l.'],
      ['Una petita dosi d’alcohol pot perjudicar la conducció?', 'Sí.', 'No, mai.', 'Només si es condueix de nit.', 'Même une petite dose peut avoir un effet négatif.'],
      ['És 0,8 g/l la taxa general autoritzada?', 'No.', 'Sí.', 'Només durant el cap de setmana.', 'Ne pas confondre 0,8 avec la limite générale de 0,5 g/l.'],
      ['Després d’un accident, el control es limita sempre al conductor presumptament culpable?', 'No, pot afectar qualsevol usuari implicat.', 'Sí.', 'Només es controla els professionals.', 'Le champ du contrôle dépasse le seul responsable présumé.'],
      ['Si es contesta el resultat de l’alcoholímetre, què es pot demanar?', 'Una anàlisi de sang de contrast.', 'L’anul·lació automàtica de la prova.', 'Que decideixi un passatger.', 'Une analyse de contrôle peut être demandée.'],
      ['Què indica «no superior a»?', 'Un límit màxim.', 'Un límit mínim.', 'Una quantitat sense límit.', 'No superior a = pas supérieur à : plafond.']
    ]
  ]),
  theme('vehicule', 'Mécanique & éco-conduite', '⚙️', 'teal', 'Comprendre les pièces et les bons gestes.', ['VEHICLE', 'MAINTENANCE', 'ENVIRONMENT'], ['953', '1249', '1306', '1650', '1894'], 'Synthèse p. 10–12', '6, 62 · mécanique : synthèse', [
    page('Les commandes et les pneus', 'TRANSMETTRE · FREINER · ADHÉRER', [
      "La **transmission** transmet le mouvement du moteur aux roues motrices. Elle permet donc d’utiliser la force du moteur pour faire avancer le véhicule.",
      "**Embragatge** signifie embrayage. Avec la pédale enfoncée, on est **débrayé** ; avec la pédale relâchée, on est **embrayé** : repère bien l’état de la pédale dans la question.",
      "Les **roues motrices reçoivent la force du moteur**. Les **roues directrices orientent la trajectoire** : ces deux noms décrivent des fonctions différentes.",
      "Le **fre de servei** est le frein commandé par la pédale pour ralentir ou arrêter le véhicule. Le **fre d’estacionament** maintient le véhicule immobilisé lorsqu’il est garé.",
      "Contrôle la pression des pneus **à froid, selon les valeurs du constructeur**. Vérifie aussi leur usure : la pression ne suffit pas à connaître leur état.",
      "Des vibrations ou une usure irrégulière des pneus doivent conduire à **faire vérifier le véhicule**. L’entretien permet de repérer un problème avant qu’il compromette la sécurité."
    ], "Associe chaque pièce à son action : **la transmission transmet, les roues motrices entraînent, les roues directrices dirigent**. EMBRAGATGE et RODES rappellent les mots français embrayage et roues.", [['roda / pneumàtic', 'roue / pneu'], ['desgast', 'usure'], ['fre', 'frein']], ['Premut / lliure', "Premut signifie « enfoncé » et lliure signifie ici « relâché ». Ces mots décrivent la pédale. Desembragat et embragat décrivent ensuite l’état de l’embrayage : ne mélange pas les deux paires.", 'Pedal premut: desembragat. Pedal lliure: embragat.', 'Pédale enfoncée : débrayé. Pédale relâchée : embrayé.']),
    page('Conduire souplement, consommer moins', 'ANTICIPER > ACCÉLÉRER / FREINER', [
      "**Anticiper la circulation** permet d’éviter des accélérations suivies immédiatement d’un freinage. Une allure régulière limite les changements de vitesse inutiles.",
      "Choisis un **rapport adapté à la vitesse et au fonctionnement du moteur**. Un rapport plutôt long peut aider à économiser, à condition de ne pas forcer le moteur.",
      "Pour transporter les bagages, préfère le **coffre à la galerie de toit**. Il perturbe moins l’écoulement de l’air autour de la voiture.",
      "Une charge inutile, une galerie ou des vitres ouvertes à vitesse élevée peuvent **augmenter la consommation**. Le poids et la résistance à l’air demandent davantage d’énergie au véhicule.",
      "En descente, garde une vitesse engagée pour bénéficier du **frein moteur**. Ne roule pas au point mort et ne coupe pas le contact pour essayer d’économiser du carburant.",
      "Utiliser les freins de façon continue et excessive peut **les faire surchauffer**. Leur efficacité peut alors diminuer, ce qui rend le ralentissement moins sûr."
    ], "Pense **« regarder loin pour agir moins brusquement »**. Le mot ESTALVIAR signifie économiser : imagine une tirelire pour associer une conduite régulière à moins de carburant consommé.", [['estalviar', 'économiser'], ['maleter / baca', 'coffre / galerie'], ['marxa llarga', 'rapport long']], ['Perquè…', "Perquè signifie « parce que » lorsqu’il donne une explication. Dans l’exemple, la première partie donne le choix conseillé ; la partie après perquè explique la raison de ce choix.", 'El maleter és preferible perquè redueix la resistència a l’aire.', 'Le coffre est préférable parce qu’il réduit la résistance de l’air.'])
  ], [
    [
      ['Quina funció té la transmissió?', 'Portar el moviment del motor a les rodes motrius.', 'Il·luminar la carretera.', 'Rentar el parabrisa.', 'La transmission transmet le mouvement.'],
      ['Amb el pedal d’embragatge premut, el motor està…', 'Desembragat.', 'Embragat.', 'Necessàriament apagat.', 'Pédale enfoncée = débrayé.'],
      ['Quines rodes reben la força del motor?', 'Les motrius.', 'Només les de recanvi.', 'Sempre totes sense excepció.', 'Motrices = entraînées par le moteur.'],
      ['Quina funció tenen les rodes directrius?', 'Orientar la trajectòria.', 'Il·luminar els girs.', 'Guardar combustible.', 'Directrius = roues qui dirigent.'],
      ['Quin fre immobilitza el vehicle estacionat?', 'El fre d’estacionament.', 'Només el fre motor.', 'L’embragatge.', 'Le frein de stationnement maintient le véhicule garé.'],
      ['Com comprovem habitualment la pressió dels pneumàtics?', 'En fred i segons el fabricant.', 'Sempre en calent i a l’atzar.', 'Només quan estan buits.', 'Pression à froid et valeur du constructeur.'],
      ['Si detectem vibracions o desgast irregular, què convé fer?', 'Fer revisar el vehicle.', 'Ignorar-ho.', 'Augmentar sempre la pressió al màxim.', 'Ces signes justifient un contrôle.']
    ], [
      ['Què afavoreix una conducció eficient?', 'Anticipar i evitar acceleracions innecessàries.', 'Accelerar i frenar constantment.', 'Circular sempre en primera.', 'Anticiper permet une allure plus régulière.'],
      ['Quan el motor ho permet, quina marxa ajuda a conduir eficientment?', 'Una marxa més llarga adequada.', 'Sempre la primera marxa.', 'Sempre el punt mort.', 'Rapport long adapté, sans forcer le moteur.'],
      ['Per l’aerodinàmica, on és preferible portar l’equipatge?', 'Al maleter.', 'A la baca.', 'Fora de les finestres.', 'Le coffre offre moins de résistance à l’air qu’une galerie.'],
      ['Una càrrega innecessària pot…', 'Augmentar el consum.', 'Eliminar el consum.', 'Millorar sempre la frenada.', 'Transporter du poids inutile augmente les besoins d’énergie.'],
      ['És segur baixar un port amb el contacte tret?', 'No.', 'Sí, per estalviar combustible.', 'Sí, si la carretera és recta.', 'On ne coupe pas le contact en descente.'],
      ['Per què conservem una marxa adequada en baixada?', 'Per disposar del fre motor.', 'Per eliminar l’adherència.', 'Per no necessitar cap control.', 'Une vitesse engagée conserve le frein moteur.'],
      ['Un ús continu i excessiu dels frens pot provocar…', 'Sobreescalfament i pèrdua d’eficàcia.', 'Una millora permanent dels frens.', 'Més combustible al dipòsit.', 'La surchauffe peut réduire l’efficacité du freinage.']
    ]
  ]),
  theme('transport', 'Passagers & chargement', '🧳', 'amber', 'Tout attacher. Tout garder visible.', ['SAFETY', 'CHILDREN', 'MOTORCYCLE', 'LOAD', 'DIMENSIONS'], ['1300', '1207', '1384', '953'], 'Synthèse p. 14–15 · QCM p. 7–10', '31, 37, 38, 67, 69, 70', [
    page('Protéger chaque occupant', 'CEINTURE DEVANT + DERRIÈRE', [
      "Dans une voiture équipée de ceintures, **le conducteur et tous les passagers doivent s’attacher**, hors exemptions légales. La règle s’applique en ville comme sur route.",
      "Cette obligation concerne aussi **les passagers installés à l’arrière**. La ceinture arrière n’est donc pas une simple recommandation réservée aux longs trajets.",
      "Dans une voiture jusqu’à neuf places, la règle étudiée vise l’enfant **de moins de 10 ans ET de moins de 1,50 m**. Il voyage normalement à l’arrière avec un dispositif adapté, sous réserve des exceptions prévues.",
      "Le siège enfant doit être **homologué et adapté à sa taille et à son poids**. Il faut également l’installer selon les instructions du fabricant pour qu’il protège correctement.",
      "Sur une moto ordinaire, le conducteur et le passager portent **un casque correctement attaché et des gants adaptés**. Un casque simplement posé sur la tête ne suffit pas.",
      "Respecte le **nombre de places autorisées** du véhicule. Un trajet court ne permet pas d’ajouter une personne au-delà de cette capacité."
    ], "Dans la règle enfant, lis bien le **ET entre l’âge et la taille** : les deux critères sont associés. CINTURÓ rappelle ceinture, CASC rappelle casque et CORDAT évoque une corde pour penser « attaché ».", [['cinturó', 'ceinture'], ['seient', 'siège'], ['casc cordat', 'casque attaché']], ['Tant… com…', "Tant… com… signifie « aussi bien… que… ». La phrase réunit les deux groupes : le conducteur et les passagers sont tous concernés par l’obligation de porter la ceinture.", 'Tant el conductor com els passatgers han de portar cinturó.', 'Aussi bien le conducteur que les passagers doivent porter la ceinture.']),
    page('Fixer la charge et dégager la vue', 'ATTACHÉ · STABLE · VISIBLE', [
      "Fixe solidement les objets transportés pour qu’ils **ne tombent pas et ne glissent pas**. Ils doivent rester en place même pendant un freinage ou un virage.",
      "Place les bagages de manière à conserver **la stabilité du véhicule et la visibilité du conducteur**. Pouvoir fermer le coffre ne suffit pas si la charge gêne la conduite.",
      "Le chargement ne doit masquer **ni les feux, ni la plaque d’immatriculation, ni les signaux du véhicule**. Les autres doivent pouvoir voir tes indications et identifier le véhicule.",
      "Répartis la charge et respecte les **masses et dimensions autorisées**. La capacité apparente du coffre ne remplace pas les limites prévues pour le véhicule.",
      "Pour charger ou décharger, **coupe le moteur** et utilise si possible un emplacement hors voie publique. Si tu dois le faire sur la voie publique, privilégie le côté du trottoir.",
      "**Pes** désigne le poids, **amplada** la largeur et **llargada** la longueur. **Sobresortir** signifie dépasser du gabarit, par exemple lorsqu’un objet dépasse de la carrosserie."
    ], "Vérifie trois choses : **les objets tiennent, tu vois bien, les feux et la plaque restent visibles**. AMPLADA évoque l’amplitude en largeur ; LLARGADA évoque quelque chose qui s’allonge.", [['càrrega', 'chargement'], ['lligada', 'attachée'], ['matrícula', 'immatriculation / plaque']], ['Ni… ni…', "Ni… ni… fonctionne comme en français et relie plusieurs éléments dans une négation. Dans la phrase, la charge ne doit masquer aucun des deux éléments : ni les feux ni la plaque.", 'La càrrega no pot tapar ni els llums ni la matrícula.', 'Le chargement ne peut masquer ni les feux ni la plaque.'])
  ], [
    [
      ['En un turisme equipat, qui ha de portar cinturó, fora de les exempcions legals?', 'El conductor i tots els passatgers.', 'Només el conductor.', 'Només els ocupants del davant.', 'La ceinture concerne aussi les passagers arrière.'],
      ['En una via urbana, el cinturó deixa de ser obligatori?', 'No.', 'Sí, sempre.', 'Sí, als seients davanters.', 'L’obligation vaut en ville comme hors agglomération.'],
      ['La norma general estudiada per al seient infantil combina…', 'Menys de 10 anys i menys d’1,50 m.', 'Només el color del vehicle.', 'Més de 18 anys i més d’1,80 m.', 'La règle étudiée combine âge ET taille.'],
      ['En un turisme de fins a nou places, on va normalment l’infant afectat per aquesta norma?', 'Al darrere, amb un sistema adequat.', 'Al davant sense retenció.', 'Al maleter.', 'À l’arrière avec le dispositif adapté, sauf exceptions prévues.'],
      ['A què ha d’estar adaptat el sistema de retenció infantil?', 'A la talla i al pes.', 'Només al color dels seients.', 'Només al preu del cotxe.', 'Taille et poids guident le choix.'],
      ['En una motocicleta ordinària, com s’ha de portar el casc?', 'Degudament cordat.', 'Descordat.', 'Penjat al braç.', 'Un casque doit être attaché.'],
      ['Podem superar el nombre de places autoritzades si el trajecte és curt?', 'No.', 'Sí.', 'Sí, si els passatgers són adults.', 'La brièveté du trajet ne change pas la capacité autorisée.']
    ], [
      ['Com ha d’anar la càrrega?', 'Ben fixada perquè no es desplaci ni caigui.', 'Solta per moure’s als revolts.', 'Subjectada només pel passatger.', 'La fixation empêche déplacements et chutes.'],
      ['La càrrega pot reduir la visibilitat del conductor?', 'No.', 'Sí, si pesa poc.', 'Sí, en ciutat.', 'La vue du conducteur doit rester dégagée.'],
      ['Podem tapar la matrícula amb equipatge ben lligat?', 'No.', 'Sí, si està ben lligat.', 'Sí, només de dia.', 'Bien attaché ne signifie pas autorisé à masquer la plaque.'],
      ['Què hem de respectar en carregar el vehicle?', 'Les masses i dimensions autoritzades.', 'Només la capacitat del maleter.', 'Només el nombre de bosses.', 'Les limites de masse et de dimensions restent applicables.'],
      ['Durant la càrrega o descàrrega, com ha d’estar el motor?', 'Aturat.', 'Accelerat.', 'Sempre en marxa.', 'Chargement/déchargement : moteur coupé.'],
      ['Si cal descarregar a la via pública, quin costat és preferible?', 'El més pròxim a la vorera.', 'El centre de la calçada.', 'El del trànsit que s’apropa.', 'On privilégie le côté trottoir.'],
      ['Quina dimensió indica «amplada»?', 'L’amplària del vehicle.', 'La llargada.', 'El pes.', 'Amplada = largeur ; llargada = longueur.']
    ]
  ]),
  theme('documents', 'Permis & documents', '🪪', 'violet', 'Le conducteur, le véhicule, l’assurance.', ['DOCUMENTATION', 'MAINTENANCE'], ['1149', '1221', '1303', '1306'], 'Synthèse p. 2–4 · QCM p. 1–2', '87, 88, 95, 98, 99 · règlement des permis, art. 4', [
    page('Qui autorise quoi ?', 'PERMIS ≠ IMMATRICULATION', [
      "Le **permís de conduir** est le permis de conduire de la personne. Il indique quelles catégories de véhicules cette personne est autorisée à conduire.",
      "Le **certificat de matrícula**, ou document de circulation du véhicule, concerne le véhicule lui-même. Il sert à l’identifier administrativement et à autoriser sa circulation.",
      "**Assegurança** signifie assurance. L’assurance obligatoire de responsabilité civile couvre les dommages causés aux tiers, et non automatiquement toutes les pannes de ton propre véhicule.",
      "L’**ITV** est l’inspection technique du véhicule, c’est-à-dire le contrôle technique. Elle vérifie son état au regard des exigences réglementaires.",
      "Tu dois pouvoir présenter les **documents exigibles et en cours de validité** : permis, immatriculation, assurance et contrôle technique lorsque celui-ci s’applique au véhicule.",
      "Ces documents ont des rôles différents : **l’assurance ne remplace ni le permis ni le contrôle technique**. Posséder l’un ne dispense pas de respecter les autres obligations."
    ], "Demande-toi ce que le document concerne : **le conducteur, le véhicule, les dommages ou son état technique**. CONDUIR rappelle conduire ; ASSEGURANÇA rappelle assurance.", [['vigent', 'en cours de validité'], ['danys a tercers', 'dommages aux tiers'], ['exhibir', 'présenter']], ['Si escau', "Si escau signifie « le cas échéant », autrement dit « si cela s’applique à cette situation ». Pour l’ITV, cela renvoie aux exigences du véhicule, pas à la volonté du conducteur.", 'El certificat de la ITV, si escau.', 'Le certificat de contrôle technique, le cas échéant.']),
    page('Lire les limites sans se tromper', 'PERSONNES · POIDS · VALIDITÉ', [
      "Pour le nombre de personnes, le permis B permet **neuf personnes maximum, conducteur compris**. Cela correspond donc au conducteur plus huit passagers, et non neuf passagers en plus de lui.",
      "La **MMA est la masse maximale autorisée**. Ce plafond ne doit pas être confondu avec le poids du véhicule à vide : les deux nombres décrivent des choses différentes.",
      "**Pes en buit** signifie poids à vide et **remolc** signifie remorque. Avant d’atteler une remorque, vérifie que ton permis et les caractéristiques de l’ensemble le permettent.",
      "Toutes les catégories de permis ne donnent pas les mêmes droits. Vérifie **le véhicule, la remorque éventuelle et le nombre de places**, au lieu de te fier seulement à l’apparence du véhicule.",
      "**Vigent** signifie en cours de validité, tandis que **caducat** signifie périmé. Un document dont la date de validité est dépassée n’est donc plus vigent.",
      "Respecte l’échéance de contrôle technique propre au véhicule. Même avec une **ITV valide**, un contrôle des émissions du véhicule reste possible."
    ], "**Incloent-hi** ressemble à « incluant ». Quand tu lis neuf personnes conducteur compris, compte-toi dans le total : **toi + huit passagers = neuf**.", [['incloent-hi', 'y compris'], ['pes en buit', 'poids à vide'], ['remolc', 'remorque']], ['Fins a / més de', "Fins a signifie « jusqu’à », avec la limite incluse. Més de signifie « plus de », sans inclure la limite : fins a nou autorise neuf, tandis que més de nou commence au-delà de neuf.", 'Fins a nou persones, incloent-hi el conductor.', 'Jusqu’à neuf personnes, conducteur compris.'])
  ], [
    [
      ['Quin document autoritza una persona a conduir una categoria de vehicles?', 'El permís de conduir.', 'Només l’assegurança.', 'Només el certificat de matrícula.', 'Le permis concerne les droits du conducteur.'],
      ['Quin document identifica administrativament el vehicle?', 'El certificat de matrícula.', 'El carnet d’un passatger.', 'La recepta mèdica.', 'L’immatriculation concerne le véhicule.'],
      ['Què cobreix l’assegurança obligatòria de responsabilitat civil?', 'Els danys a tercers.', 'Sempre totes les avaries pròpies.', 'Només el combustible.', 'Responsabilité civile = dommages causés aux tiers.'],
      ['Què significa ITV?', 'Inspecció tècnica de vehicles.', 'Impost de transport de viatgers.', 'Indicador de trajectòria variable.', 'ITV = contrôle technique du véhicule.'],
      ['L’assegurança substitueix el permís de conduir?', 'No.', 'Sí, si és vigent.', 'Sí, en ciutat.', 'Ces documents répondent à des obligations différentes.'],
      ['Quina assegurança cal poder acreditar?', 'Una assegurança vigent.', 'Una assegurança caducada.', 'La d’un altre vehicle sense relació.', 'Vigent = en cours de validité.'],
      ['Què significa «ITV, si escau»?', 'ITV quan sigui exigible per al vehicle.', 'ITV només si el conductor vol.', 'ITV mai obligatòria.', 'Si escau = si applicable, pas facultatif à volonté.']
    ], [
      ['Amb el permís B, quin és el nombre màxim de persones?', '9, incloent-hi el conductor.', '10, incloent-hi el conductor.', '9 passatgers més el conductor.', 'Neuf au total, conducteur compris.'],
      ['En un vehicle de nou places, amb el conductor a bord, quants passatgers hi caben com a màxim?', '8.', '9.', '10.', 'Toi + 8 = 9 personnes.'],
      ['Què significa MMA?', 'Massa màxima autoritzada.', 'Massa mínima aconsellada.', 'Mesura màxima d’amplada.', 'MMA donne une masse maximale autorisée.'],
      ['«Pes en buit» i MMA són necessàriament el mateix?', 'No.', 'Sí, sempre.', 'Sí, si el vehicle és nou.', 'Poids à vide et masse maximale autorisée sont distincts.'],
      ['Abans d’arrossegar un remolc, què hem de verificar?', 'Que el permís i el conjunt ho permetin.', 'Només que el remolc sigui del mateix color.', 'Només que sigui de dia.', 'L’autorisation dépend du permis et des caractéristiques de l’ensemble.'],
      ['Un document caducat és vigent?', 'No.', 'Sí.', 'Només dins de poblat.', 'Caducat = périmé ; vigent = valide.'],
      ['Amb ITV vigent, poden comprovar les emissions del vehicle?', 'Sí.', 'No, mai.', 'Només si no tenim assegurança.', 'L’ITV valide n’interdit pas un contrôle des émissions.']
    ]
  ]),
  theme('accidents', 'Accident & panne', '🦺', 'rose', 'Protéger. Alerter. Aider.', ['ACCIDENT', 'EMERGENCY', 'SAFETY'], ['929', '1142', '1176', '1197'], 'Synthèse p. 7–8 · QCM p. 7–8', '56, 57, 58, 59', [
    page('Éviter le deuxième accident', 'P → A → S', [
      "**Protéger vient en premier** : arrête-toi sans créer un nouveau danger, si possible hors de la chaussée. Ton intervention ne doit pas provoquer un second accident.",
      "Si tu occupes la chaussée, porte le **gilet réfléchissant pour être visible**. Signale le danger en veillant à ne pas t’exposer toi-même à la circulation.",
      "**Alerte les secours ou la police** en donnant le lieu précis de l’accident. Indique aussi les dangers présents, les véhicules concernés et le nombre de blessés observés.",
      "**Secourir signifie aider selon tes capacités**, en suivant les instructions des secours. N’improvise pas une manœuvre que tu ne sais pas réaliser.",
      "Lorsqu’il y a des blessés, **reste disponible sur place**, sauf nécessité de partir chercher de l’aide. Donner simplement ton numéro de téléphone ne suffit pas pour quitter les lieux.",
      "Évite de modifier inutilement les lieux de l’accident. **La sécurité des personnes reste toutefois prioritaire** lorsqu’une action est nécessaire pour les protéger."
    ], "Retiens **PAS : Protéger → Alerter → Secourir**. En catalan, retrouve la même suite avec protegir → avisar → socórrer : tu sécurises la situation avant d’organiser l’aide.", [['armilla reflectant', 'gilet réfléchissant'], ['avisar', 'alerter'], ['ferit', 'blessé']], ['Primer / després', "Primer signifie « d’abord » et després signifie « ensuite ». Ces mots donnent l’ordre des actions : dans l’exemple, la protection vient avant l’alerte.", 'Primer protegim; després avisem.', 'D’abord nous protégeons ; ensuite nous alertons.']),
    page('Donner les bonnes informations', 'OÙ ? QUOI ? COMBIEN ?', [
      "**On ?** demande où se trouve l’accident, **què ?** demande ce qui se passe et **quants ?** demande combien de personnes ou de véhicules sont concernés. Ces mots t’aident à comprendre les questions des secours.",
      "**Ferit** signifie blessé, **inconscient** signifie inconscient et **respira** signifie respire. Ce vocabulaire permet de comprendre ou de décrire les observations demandées.",
      "Décris **ce que tu observes réellement** et réponds aux questions des secours. Suis leurs consignes sans inventer de diagnostic ni improviser une intervention.",
      "La présignalisation du danger doit être **visible à au moins 100 mètres**. Cette distance indique d’où l’on doit pouvoir la voir, pas qu’elle doit forcément être posée exactement à 100 mètres.",
      "Après un accident avec uniquement des dégâts matériels, préviens les assureurs dans un délai maximal de **huit jours calendaires**. Ce délai concerne la déclaration aux assureurs.",
      "Les **dies naturals** sont les jours calendaires : les week-ends et les jours fériés comptent aussi. **Danys materials** désigne les dégâts matériels, par exemple ceux subis par les véhicules."
    ], "Pour transmettre une information utile, pense **lieu → situation observée → personnes concernées**. AVISAR rappelle « donner un avis d’alerte » ; FERIT désigne la personne blessée.", [['romandre', 'rester'], ['avaria', 'panne'], ['dies naturals', 'jours calendaires']], ['Com a mínim / com a màxim', "Com a mínim signifie « au minimum » et com a màxim signifie « au maximum ». Repère ce mot avant le nombre : un minimum demande au moins cette valeur, un maximum interdit de la dépasser.", 'Visible a cent metres com a mínim.', 'Visible à cent mètres au minimum.'])
  ], [
    [
      ['En arribar a un accident, què hem de fer primer?', 'Protegir sense crear un altre perill.', 'Aparcar al mig sense mirar.', 'Marxar sense valorar la situació.', 'La première priorité est d’éviter un autre accident.'],
      ['Si ocupem la calçada en un accident, què hem de posar-nos?', 'L’armilla reflectant.', 'Uns auriculars.', 'Una manta sobre el cap.', 'Le gilet réfléchissant aide à être vu.'],
      ['A qui hem d’avisar si hi ha ferits?', 'Als serveis d’emergència o a la Policia.', 'Només a un amic.', 'Només al taller.', 'Alerter les services compétents.'],
      ['Quina informació és útil en l’avís?', 'El lloc, els perills i el nombre de ferits.', 'Només el color de la roba.', 'Només la marca del telèfon.', 'Les secours ont besoin de localiser et évaluer l’accident.'],
      ['Com hem d’ajudar els ferits?', 'Seguint les instruccions i les nostres capacitats.', 'Improvisant qualsevol maniobra.', 'Sense escoltar els serveis d’emergència.', 'Aider utilement, en suivant les consignes.'],
      ['Amb ferits, podem marxar simplement després de donar el nostre telèfon?', 'No, cal romandre disponibles llevat de necessitat d’ajuda.', 'Sí, sempre.', 'Sí, si tenim pressa.', 'Il faut rester sur place, sauf nécessité liée à l’aide.'],
      ['Quin ordre correspon a PAS?', 'Protegir, avisar, socórrer.', 'Accelerar, sortir, parar.', 'Socórrer, marxar, avisar.', 'PAS : protection, alerte, secours.']
    ], [
      ['Quina pregunta demana el lloc de l’accident?', 'On?', 'Quants?', 'Quan?', 'On = où ; quan = quand.'],
      ['Què significa «ferit»?', 'Una persona lesionada.', 'Un vehicle aparcat.', 'Una carretera seca.', 'Ferit = blessé.'],
      ['Què comuniquem als serveis d’emergència?', 'Allò que observem, seguint les seves preguntes.', 'Un diagnòstic inventat.', 'Només que tenim pressa.', 'Décrire les faits observés aide les secours.'],
      ['A quina distància mínima ha de ser visible la presenyalització del perill?', '100 metres.', '10 metres.', '25 metres.', 'Il s’agit de visibilité à au moins 100 m.'],
      ['«Visible a 100 m» vol dir necessàriament «col·locat exactament a 100 m»?', 'No.', 'Sí.', 'Només de dia.', 'Distance de visibilité et distance de pose sont différentes.'],
      ['Amb només danys materials, quin termini màxim hi ha per avisar les asseguradores?', '8 dies naturals.', '30 dies naturals.', '15 dies hàbils.', 'Le Code prévoit huit jours calendaires au maximum.'],
      ['Els dies naturals inclouen els caps de setmana?', 'Sí.', 'No.', 'Només els dissabtes.', 'Jours calendaires = tous les jours.']
    ]
  ]),
  theme('catala-pieges', 'Català · les mots-pièges', '🔎', 'violet', 'Bonus langue · une lettre change tout.', ['CATALA'], [], 'quizz.json : q072–q098, q127, q129, q138–q140 · Synthèse p. 16', '', [
    page('Obligation, interdiction ou exception ?', 'CAL ≠ NO CAL ≠ NO ES POT', [
      "**Cal frenar** signifie « il faut freiner » : l’action est nécessaire. **No cal frenar** signifie « il n’est pas nécessaire de freiner » : l’obligation disparaît, mais ce n’est pas une interdiction.",
      "**No es pot** signifie « on ne peut pas ». Dans une règle comme **no es pot estacionar**, cela exprime une interdiction : on n’a pas le droit de stationner.",
      "**Només** signifie seulement et **llevat de** signifie sauf. Le premier limite les cas concernés ; le second annonce une exception à la règle.",
      "Avec une négation, **no… cap** signifie aucun. Dans **no hi ha cap vehicle**, la phrase dit qu’il n’y a aucun véhicule, et non qu’un véhicule est devant.",
      "**Mai** signifie jamais, **sempre** signifie toujours et **en cap cas** signifie en aucun cas. Ces mots changent la portée de la réponse : lis-les avant de choisir.",
      "**Sempre que** peut signifier « à condition que » lorsqu’il introduit une condition. Selon le contexte, il peut aussi signifier « chaque fois que » : lis la phrase entière pour trancher."
    ], "Imagine deux messages différents : **NO CAL = pas nécessaire** et **NO ES POT = pas autorisé**. Une action qui n’est pas obligatoire n’est pas automatiquement interdite.", [['només', 'seulement'], ['llevat de', 'sauf'], ['cap vehicle', 'aucun véhicule (avec no)']], ['Repérer le petit mot', "Commence par repérer cal ou es pot, puis regarde s’il y a no devant. Ces petits mots déterminent si la phrase donne une obligation, retire une obligation ou exprime une interdiction.", 'No cal parar. / No es pot parar.', 'Il n’est pas nécessaire de s’arrêter. / On ne peut pas s’arrêter.']),
    page('Quantités, causes et petits pièges', 'PLUS ≠ MOINS · POURQUOI ≠ PARCE QUE', [
      "**Més de** signifie plus de et **menys de** signifie moins de : la valeur citée n’est pas incluse. Avec **fins a**, « jusqu’à », la limite est au contraire comprise.",
      "**Almenys** et **com a mínim** signifient au moins : almenys 50 veut dire 50 ou davantage. **Com a màxim** donne un maximum qu’il ne faut pas dépasser.",
      "**Prou** signifie assez et **massa** signifie trop devant un adjectif. Ainsi, **massa ràpid** veut dire trop rapide, alors que prou ne signale pas un excès.",
      "**Per què ?**, en deux mots, pose la question « pourquoi ? ». **Perquè**, en un mot, peut y répondre avec le sens « parce que ».",
      "**Per tant** annonce une conséquence : « donc » ou « par conséquent ». **Ja que** donne une raison : « puisque » ou « car ».",
      "**Cap a** signifie vers, comme dans girar cap a la dreta, tourner vers la droite. **El cap** est la tête ; dans **no… cap**, le même mot participe au sens « aucun »."
    ], "MÉS peut te rappeler « mets-en plus » et MENYS « moins ». Pour la cause, **PER QUÈ séparé pose la question ; PERQUÈ collé donne la raison**.", [['prou / massa', 'assez / trop'], ['cap a', 'vers'], ['per tant', 'donc']], ['Du nombre à l’inégalité', "Transforme l’expression en une plage de nombres : més de 50 exclut 50 ; fins a 50 inclut 50 et les valeurs inférieures ; almenys 50 inclut 50 et les valeurs supérieures.", 'Fins a nou persones.', 'Jusqu’à neuf personnes, neuf compris.'])
  ], [
    [
      ['Quina expressió indica una obligació?', 'Cal aturar-se.', 'No cal aturar-se.', 'Es pot aturar.', 'Cal = il faut.'],
      ['Què vol dir «no cal aturar-se»?', 'No és necessari aturar-se.', 'Està prohibit aturar-se.', 'És obligatori aturar-se.', 'No cal supprime l’obligation ; il ne crée pas une interdiction.'],
      ['Quina frase expressa una prohibició?', 'No es pot estacionar.', 'No cal estacionar.', 'Es pot estacionar.', 'No es pot = on ne peut pas.'],
      ['Quin mot significa «solament»?', 'Només.', 'Sempre.', 'Tothom.', 'Només = seulement = solament.'],
      ['Què vol dir «no hi ha cap vehicle»?', 'No hi ha vehicles.', 'Hi ha molts vehicles.', 'Hi ha un vehicle al davant.', 'No… cap = aucun.'],
      ['Quina expressió equival a «mai»?', 'En cap cas.', 'En tots els casos.', 'Cada dia.', 'Mai = jamais ; en cap cas = en aucun cas.'],
      ['A «es pot fer, sempre que sigui segur», què expressa «sempre que»?', 'Una condició.', 'Una prohibició absoluta.', 'Una acció passada.', 'Ici, sempre que = à condition que.']
    ], [
      ['Què significa «fins a 50»?', '50 o menys.', 'Només més de 50.', 'Sempre exactament 50.', 'Jusqu’à 50 inclut 50 et les valeurs inférieures.'],
      ['Què significa «almenys 50»?', '50 o més.', 'Menys de 50.', 'Només 49.', 'Almenys = au moins.'],
      ['Què significa «massa ràpid»?', 'Excessivament ràpid.', 'Prou lent.', 'Gens ràpid.', 'Massa devant un adjectif = trop.'],
      ['Quina expressió serveix per preguntar la causa?', 'Per què?', 'Per tant.', 'Cap a.', 'Per què? = pourquoi ?'],
      ['Quin connector introdueix una explicació de causa?', 'Perquè.', 'Després.', 'Només.', 'Perquè = parce que dans une explication.'],
      ['Quin connector introdueix una conclusió?', 'Per tant.', 'Abans de.', 'Llevat de.', 'Per tant = donc / par conséquent.'],
      ['A «girar cap a la dreta», què vol dir «cap a»?', 'En direcció a.', 'Cap vehicle.', 'La part superior del cos.', 'Cap a = vers ; el cap = tête ; no… cap = aucun.']
    ]
  ]),
  theme('catala-verbes', 'Català · verbes & réflexes', '💬', 'teal', 'Bonus langue · décoder une phrase de QCM.', ['CATALA'], [], 'quizz.json : q027, q076, q129, q156, q158, q172, q174, q205, q266 · Synthèse p. 16', '', [
    page('Les verbes qui reviennent partout', 'LIRE LE VERBE, TROUVER L’ACTION', [
      "**Aturar-se, parar-se et detenir-se** signifient s’arrêter dans les situations étudiées. Reconnaître ces trois formes évite de croire que chaque question demande une action différente.",
      "**Comprovar** veut dire vérifier, tandis que **comprar** veut dire acheter. Pour les distinguer, repère le **V de comprovar**, comme le V de « vérifier ».",
      "**Girar** signifie tourner, **avançar** signifie dépasser dans le contexte routier et **frenar** signifie freiner. Cherche le verbe pour identifier d’abord la manœuvre demandée.",
      "**Reduir** signifie réduire et **augmentar** signifie augmenter. Regarde ensuite ce qui suit : la phrase peut demander de modifier la vitesse ou la distance de sécurité.",
      "**Encendre** signifie allumer et **apagar** signifie éteindre, notamment les feux. **Senyalitzar** signifie signaler : il s’agit d’annoncer une intention aux autres usagers.",
      "**Acostar-se, apropar-se et atansar-se** signifient s’approcher. **Trobar-se** signifie se trouver : le premier groupe décrit un rapprochement, le second situe quelqu’un ou quelque chose."
    ], "Associe le mot à un geste : **FRENAR → freiner**, **GIRAR → un giratoire où l’on tourne**. Pour COMPROVAR, imagine un grand V qui te rappelle de vérifier.", [['aturar-nos', 'nous arrêter'], ['comprovar', 'vérifier'], ['acostar-nos', 'nous approcher']], ['-se / -nos', "Le pronom peut se placer après l’infinitif, relié par un trait d’union : -se veut dire « se » et -nos veut dire « nous ». Aturar-nos signifie donc « nous arrêter ».", 'Hem d’aturar-nos.', 'Nous devons nous arrêter.']),
    page('Décoder sans tout traduire', 'QUAND ? → CONDITION → ACTION', [
      "**Hem de** signifie nous devons, **podem** signifie nous pouvons et **caldrà** signifie il faudra. Repère cette expression pour savoir si l’action est obligatoire, possible ou nécessaire plus tard.",
      "**Abans de** signifie avant de et **després de** signifie après. **En suivi d’un infinitif** peut situer l’action au moment de quelque chose, comme en acostar-nos, en nous approchant.",
      "**Hi ha** signifie il y a ; **no hi ha** signifie il n’y a pas. Ces expressions indiquent la présence ou l’absence d’un élément, par exemple un obstacle.",
      "**Si cal** signifie si nécessaire, **sense** signifie sans et **amb** signifie avec. Ces petits mots précisent les conditions dans lesquelles une action doit être réalisée.",
      "**Què ?** demande quoi, **quan ?** demande quand, **on ?** demande où et **com ?** demande comment. Identifier le mot interrogatif permet de savoir quel type de réponse chercher.",
      "Découpe l’exemple en trois blocs : **en acostar-nos** indique le moment, **a una cruïlla** le lieu, et **hem de mirar** l’action obligatoire. Le sens est : en approchant d’un carrefour, nous devons regarder."
    ], "Ne cherche pas tous les mots à la fois : repère **l’action, puis le lieu et le moment**. QUAN rappelle QUAND ; ON demande OÙ, même si ce mot ressemble au pronom français « on ».", [['abans / després', 'avant / après'], ['amb / sense', 'avec / sans'], ['hi ha', 'il y a']], ['Une phrase en trois blocs', "Une phrase peut se lire par blocs. Dans l’exemple, en acostar-nos donne le moment, a una cruïlla donne le lieu et hem de mirar donne l’obligation : « nous devons regarder ».", 'En acostar-nos a una cruïlla, hem de mirar.', 'En nous approchant d’un carrefour, nous devons regarder.'])
  ], [
    [
      ['Quin verb té un sentit semblant a «aturar-se»?', 'Detenir-se.', 'Accelerar.', 'Avançar.', 'Aturar-se, parar-se et detenir-se signifient s’arrêter.'],
      ['Quin verb significa verificar?', 'Comprovar.', 'Comprar.', 'Córrer.', 'Comprovar : garde le V de vérifier.'],
      ['Quin verb descriu un canvi de direcció?', 'Girar.', 'Estacionar.', 'Dormir.', 'Girar = tourner.'],
      ['Quin verb és el contrari d’«augmentar»?', 'Reduir.', 'Encendre.', 'Avisar.', 'Augmenter ↔ réduire.'],
      ['Quin verb és el contrari d’«encendre»?', 'Apagar.', 'Avançar.', 'Comprovar.', 'Allumer ↔ éteindre.'],
      ['Què significa «acostar-se»?', 'Apropar-se.', 'Allunyar-se.', 'Estacionar sempre.', 'Acostar-se = s’approcher, comme apropar-se et atansar-se.'],
      ['A «aturar-nos», a qui es refereix «-nos»?', 'A nosaltres.', 'Només a ell.', 'A ningú.', '-nos = nous, attaché à la fin de l’infinitif.']
    ], [
      ['Quina expressió indica «nosaltres tenim l’obligació»?', 'Hem de.', 'Podem.', 'No cal.', 'Hem de = nous devons.'],
      ['Quina expressió indica una possibilitat?', 'Podem.', 'Hem de.', 'Està prohibit.', 'Podem = nous pouvons.'],
      ['Què vol dir «caldrà»?', 'Serà necessari.', 'Ja no és possible.', 'Era prohibit.', 'Caldrà = il faudra, au futur.'],
      ['Quina acció va primer a «abans de girar, mirem»?', 'Mirar.', 'Girar.', 'Les dues sempre alhora.', 'Abans de = avant de : regarder précède tourner.'],
      ['Què vol dir «hi ha un obstacle»?', 'Existeix un obstacle.', 'No existeix cap obstacle.', 'Hem eliminat l’obstacle.', 'Hi ha = il y a.'],
      ['Quina expressió significa «si és necessari»?', 'Si cal.', 'Sense.', 'Mai.', 'Si cal = si nécessaire.'],
      ['A «en acostar-nos a una cruïlla, hem de mirar», quina és l’acció obligatòria?', 'Mirar.', 'Estacionar.', 'Accelerar.', 'Hem de mirar est le bloc qui donne l’obligation.']
    ]
  ]),
  ...extraThemes
];

export const memoryAids: Record<string, string> = {
  routes: 'CARRIL → imagine un rail qui guide ta file. CARRER → la rue. CARRETERA → la route.',
  priorites: 'DRETA → droite. ESQUERRA → imagine une équerre posée à gauche (association visuelle).',
  manoeuvres: 'SENTIT → sens. DIRECCIÓ → direction. Tourner dans une rue ne veut pas forcément dire repartir en sens inverse.',
  depassements: 'AVANÇAR → passer à l’avant. SOBRESORTIR → quelque chose qui sort du véhicule.',
  stationnement: 'PARADA → pause passager. ESTACIONAMENT → je stationne. DETENCIÓ → je suis retenu par la circulation.',
  eclairage: 'ENCREUAMENT → croisement. CARRETERA → route. Les noms français des feux sont déjà presque là.'
};
