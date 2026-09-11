import type { RevisionPage, RevisionTheme } from './types';

type Item = [prompt: string, correct: string, wrong1: string, wrong2: string, explanation: string];
const page = (title: string, kicker: string, facts: string[], tip: string, words: [string, string][], grammar: [string, string, string, string]): RevisionPage => ({ title, kicker, facts, tip, words, grammar: { title: grammar[0], rule: grammar[1], ca: grammar[2], fr: grammar[3] } });
function theme(id: string, title: string, icon: string, color: string, subtitle: string, categories: string[], bankIds: string[], sources: string, articles: string, pages: RevisionPage[], items: Item[][]): RevisionTheme {
  return { id, title, icon, color, subtitle, categories, bankIds, sources, articles, pages,
    questions: items.flatMap((rows, p) => rows.map(([prompt, correct, wrong1, wrong2, explanation], i) => ({ id: `${id}-${p + 1}-${i + 1}`, page: p, prompt, answers: [correct, wrong1, wrong2], correct: 0, explanation }))) };
}

// Original, non-visual teaching questions: each answer is taught on its linked
// page. Source IDs are research anchors, not copies fed into driving scores.
export const themes: RevisionTheme[] = [
  theme('routes', 'Routes & vitesse', '🛣️', 'blue', 'Se repérer. Choisir son allure.', ['SPEED', 'LANES', 'HIGHWAY', 'DISTANCE'], ['952', '927', '7404', '7482', '1130'], 'Synthèse p. 5–6, 12–13 · QCM p. 3–4', '6, 8, 10, 20', [
    page('La bonne voie, la bonne vitesse', '90 · 60 · 50', [
      '**Route générale : 90 km/h.** Route secondaire : **60 km/h**.',
      '**En ville : 50 km/h.** Zone 30 : **30**. Zone 20 : **20**.',
      'Ces plafonds s’appliquent **sans autre signalisation**, sous réserve des limites propres au véhicule.',
      'Rouler **à droite**. Sur 3 voies à double sens : voie centrale pour dépasser ou tourner à gauche.',
      '**Calçada** = chaussée · **carril** = voie · **vorera** = trottoir · **voral** = accotement.'
    ], 'Une limite est un plafond. Une route difficile peut imposer de rouler bien plus lentement.', [['poblat', 'agglomération'], ['dreta / esquerra', 'droite / gauche'], ['carril / carrer', 'voie / rue']], ['Si no hi ha…', 'si = si · no hi ha = il n’y a pas.', 'Si no hi ha un altre senyal, el límit és de 60 km/h.', 'S’il n’y a pas d’autre panneau, la limite est de 60 km/h.']),
    page('Garder une marge pour s’arrêter', 'VOIR → RÉAGIR → FREINER', [
      '**Réaction** : entre voir le danger et commencer à freiner.',
      '**Freinage** : du début du freinage à l’arrêt complet.',
      '**Distance d’arrêt = réaction + freinage.**',
      'Vitesse plus élevée → **distance d’arrêt plus longue**. Fatigue → réaction plus lente.',
      'Pluie, faible visibilité : **ralentir + augmenter la distance de sécurité**.',
      'Pouvoir s’arrêter **dans la zone visible**. Ralentir avant un virage ou un passage étroit.'
    ], 'Aucun chiffre magique ne garantit l’arrêt. La chaussée, les pneus, la vitesse et ton état comptent.', [['frenada', 'freinage'], ['detenció', 'arrêt / immobilisation'], ['davant', 'devant']], ['Més / menys', 'més = plus · menys = moins. Repère le sens de la comparaison.', 'Més velocitat, més distància de frenada.', 'Plus de vitesse, plus de distance de freinage.'])
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
      '**L’agent passe avant les autres signaux.** Même devant un feu vert.',
      'Ensuite : **balisage temporaire**, puis **feux**, puis **panneaux**, puis **marquage au sol**.',
      'Deux signaux du même type se contredisent ? Retenir **le plus restrictif**.',
      '**STOP : arrêt complet.** Respecter la ligne ; si la vue manque, avancer prudemment et s’arrêter à nouveau avant de s’engager.',
      '**Cediu el pas** : laisser passer. S’arrêter si nécessaire.',
      'Ne pas entrer dans un carrefour **si l’on risque de le bloquer**.'
    ], '« Je suis prioritaire » ne veut jamais dire « je peux bloquer le passage ».', [['senyal', 'signal / panneau'], ['semàfor', 'feu tricolore'], ['aturar-se', 's’arrêter']], ['Cal / no cal', 'cal + infinitif = il faut · no cal = il n’est pas nécessaire.', 'Al STOP cal aturar-se.', 'Au STOP, il faut s’arrêter.']),
    page('Carrefours, ronds-points, piétons', 'DROITE · DÉJÀ DEDANS · PIÉTONS', [
      'Carrefour **sans signalisation** : priorité à droite, en règle générale.',
      'Rond-point : priorité aux véhicules **déjà dans l’anneau**, sauf consigne contraire.',
      '**Rotonda = glorieta.** Deux mots pour rond-point.',
      'En tournant : céder aux piétons qui traversent la voie où tu entres, **même sans passage marqué**.',
      'Au passage piéton : **laisser traverser**. Près d’enfants : ralentir et anticiper.',
      'Un ballon arrive sur la route ? **Un enfant peut suivre**.'
    ], 'Dans un rond-point, ne transpose pas automatiquement la priorité à droite du carrefour ordinaire.', [['cruïlla', 'carrefour'], ['vianant', 'piéton'], ['cedir el pas', 'céder le passage']], ['Encara que…', 'encara que = même si. La règle reste valable malgré la situation.', 'Cediu el pas, encara que no hi hagi pas senyalitzat.', 'Cédez le passage, même s’il n’y a pas de passage marqué.'])
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
      'Régler **siège, dossier et rétroviseurs** avant de partir.',
      'Observer **devant, derrière et sur les côtés**. Vérifier aussi l’angle mort.',
      '**Clignotant assez tôt.** Il annonce une intention ; il ne donne pas la priorité.',
      'Vérifier **vitesse + distance** des véhicules qui approchent.',
      '**Canvi de direcció** : tourner. **Canvi de sentit** : repartir dans le sens inverse.',
      'Pour tourner à droite : se rapprocher du **bord droit**, sans mettre les autres en danger.'
    ], 'Un angle mort reste invisible dans les rétroviseurs : un contrôle adapté est nécessaire.', [['girar', 'tourner'], ['intermitent', 'clignotant'], ['angle mort', 'angle mort']], ['Abans de + infinitif', 'abans de = avant de · després de = après avoir / après.', 'Abans de girar, hem de mirar.', 'Avant de tourner, nous devons regarder.']),
    page('Insertion, demi-tour, marche arrière', 'LA PLACE DOIT ÊTRE LIBRE', [
      'En s’insérant : **céder aux véhicules déjà sur la voie**.',
      '**Carril d’acceleració** : adapter sa vitesse pour entrer. Signaler et vérifier l’espace.',
      '**Carril de desacceleració** : voie pour sortir et ralentir.',
      'Demi-tour : seulement **autorisé + visible + sans danger**. Pas en virage sans visibilité ni en tunnel, sauf autorisation expresse.',
      'Marche arrière : pour une manœuvre nécessaire, sur **le minimum de distance**. Pas pour rouler normalement.',
      'Avant de reculer : vérifier les obstacles. **S’arrêter si quelqu’un approche**.'
    ], 'Si la manœuvre devient dangereuse, on y renonce. Les feux de détresse ne la rendent pas autorisée.', [['incorporar-se', 's’insérer'], ['marxa enrere', 'marche arrière'], ['sentit contrari', 'sens opposé']], ['Només / llevat de', 'només = seulement · llevat de = sauf. Ces mots limitent une autorisation.', 'Fem marxa enrere només el mínim indispensable.', 'Nous reculons seulement du minimum indispensable.'])
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
      'En règle générale : dépasser **par la gauche**.',
      'Vérifier **devant + derrière + sens opposé + signalisation**.',
      'Prévoir l’espace pour **dépasser puis se rabattre** sans gêner.',
      'Virage, sommet, brouillard : ne pas empiéter sur le sens opposé **sans visibilité suffisante**.',
      'Avant un déplacement latéral : **signaler** et vérifier qu’aucun véhicule ne dépasse déjà.',
      'La situation change ? **Renoncer** si le dépassement n’est plus sûr.'
    ], 'Le désir de gagner quelques secondes n’est pas un critère de sécurité.', [['avançar', 'dépasser un véhicule'], ['canvi de rasant', 'sommet / changement de pente'], ['visibilitat', 'visibilité']], ['Hem de / podem', 'hem de = nous devons · podem = nous pouvons. Obligation et possibilité sont différentes.', 'Abans d’avançar, hem de comprovar la visibilitat.', 'Avant de dépasser, nous devons vérifier la visibilité.']),
    page('Pendant et après la manœuvre', 'NE PAS SERRER · NE PAS FORCER', [
      'Véhicule dépassé : **ne pas accélérer**. Faciliter la manœuvre.',
      'Avant de revenir à droite : laisser au moins **deux fois la longueur du véhicule dépassé**.',
      'Ne pas dépasser un véhicule **arrêté pour laisser traverser des piétons**.',
      'Hors agglomération, vélo ou deux-roues : **au moins 1,5 m d’écart latéral**. Attendre si l’espace manque.',
      'En ville, dépassement par la droite possible avec **au moins 2 voies dans le même sens**, sans danger.',
      '**Avançar** = dépasser un véhicule. **Sobresortir** = dépasser du gabarit : attention au contexte.'
    ], 'L’exception urbaine par la droite ne permet pas de dépasser partout par la droite.', [['vehicle avançat', 'véhicule dépassé'], ['llargada', 'longueur'], ['separació lateral', 'écart latéral']], ['Almenys / com a mínim', 'Les deux signifient au moins. Ils donnent un minimum, pas un maximum.', 'Calen almenys dos carrils en el mateix sentit.', 'Il faut au moins deux voies dans le même sens.'])
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
      '**Parada** : arrêt volontaire pour faire monter/descendre ou charger/décharger.',
      '**Estacionament** : stationnement volontaire hors de ces opérations.',
      '**Detenció** : immobilisation imposée par la circulation, une panne ou une urgence.',
      'Feu rouge ou embouteillage : **detenció**. Déposer un passager : **parada**.',
      'Se placer **à droite** ; en ville à sens unique, aussi à gauche si l’emplacement le permet.',
      'Ne jamais créer de **danger ni d’obstacle** pour les autres.'
    ], 'Le mot « arrêt » en français ne suffit pas : demande-toi pourquoi le véhicule est immobilisé.', [['aturat', 'arrêté'], ['aparcament', 'parking / stationnement'], ['sentit únic', 'sens unique']], ['També / tampoc', 'també = aussi · tampoc = non plus. Une lettre peut inverser le sens.', 'En una via urbana de sentit únic, també a l’esquerra.', 'Dans une rue à sens unique, aussi à gauche.']),
    page('Choisir et quitter sa place', 'VISIBILITÉ · FREIN · CONTRÔLE', [
      'Pas d’arrêt ni de stationnement **sur un passage piéton, en tunnel ou sans visibilité**.',
      'Ne pas stationner dans un **emplacement réservé au transport public**.',
      'Même emplacement sur la voie publique : **15 jours consécutifs maximum**, sous réserve des restrictions locales.',
      'Stationner en pente, boîte manuelle : **frein de stationnement + 1re en montée / marche arrière en descente**.',
      'Avant d’ouvrir la porte : vérifier **piétons, vélos et véhicules**.',
      'Pour repartir : **observer, signaler, céder le passage**.'
    ], 'Les feux de détresse ne transforment pas une place interdite en place autorisée.', [['pujada / baixada', 'montée / descente'], ['fre d’estacionament', 'frein de stationnement'], ['romandre', 'rester']], ['No es pot + infinitif', 'no es pot = on ne peut pas. Dans une règle de circulation, c’est une interdiction.', 'No es pot estacionar en un túnel.', 'On ne peut pas stationner dans un tunnel.'])
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
      '**Position** : rendre le véhicule visible. Ce ne sont pas les feux pour éclairer loin.',
      '**Encreuament** : feux de croisement. **Carretera** : feux de route, plus éblouissants.',
      'Risque d’éblouir quelqu’un : **passer en croisement**, même si l’autre ne le fait pas.',
      'Véhicule arrêté ou stationné : **pas de feux de route**.',
      '**Marxa enrere** : feu blanc à l’arrière. Feux stop : rouges, plus intenses que la position.',
      '**Intermitents** : clignotants. Signaler assez tôt, puis les couper après la manœuvre.'
    ], '« Encreuament » veut dire croisement : dans « llums d’encreuament », il s’agit des feux, pas d’un carrefour.', [['enllumenat', 'éclairage'], ['enlluernar', 'éblouir'], ['encendre / apagar', 'allumer / éteindre']], ['Per + infinitif', 'per = pour : la tournure donne le but de l’action.', 'Els llums de posició serveixen per fer visible el vehicle.', 'Les feux de position servent à rendre le véhicule visible.']),
    page('Choisir selon la situation', 'TUNNEL = CROISEMENT, MÊME DE JOUR', [
      'En tunnel : **feux de croisement au minimum**, même de jour et même si le tunnel est éclairé.',
      'Moto : **croisement de jour comme de nuit**.',
      'Antibrouillard arrière : seulement en conditions **particulièrement défavorables**, pas à la moindre pluie.',
      'La nuit : choisir une allure permettant de s’arrêter **dans la zone éclairée**.',
      'Ébloui : **ralentir**, et s’arrêter si nécessaire pour rester en sécurité.',
      'Tunnel : suivre **feux, panneaux et instructions**. Feu d’entrée rouge : ne pas entrer.'
    ], 'Un tunnel éclairé ne dispense pas d’allumer ses propres feux.', [['boira', 'brouillard'], ['de dia / de nit', 'de jour / de nuit'], ['si cal', 'si nécessaire']], ['Encara que / també', 'encara que = même si · també = aussi. Repère ce qui ne change pas l’obligation.', 'Cal encendre els llums encara que el túnel estigui il·luminat.', 'Il faut allumer les feux même si le tunnel est éclairé.'])
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
      'Pluie : **moins d’adhérence et de visibilité**, freinage plus long.',
      'Les **premières gouttes** rendent la chaussée particulièrement glissante.',
      '**Aquaplaning** : le pneu n’évacue plus assez d’eau ; il perd le contact avec le sol.',
      'Eau sur la route : réduire l’allure, éviter **freinage et gestes brusques**.',
      'Brouillard : s’arrêter dans la zone visible ; **ne pas coller** le véhicule devant.',
      'Vent latéral : tenir le volant fermement. À la sortie d’une zone abritée, prévoir un **écart de trajectoire**.'
    ], 'Mémo : PLUJA ressemble à PLUIE. BOIRA : imagine une « bouillie » de brouillard devant toi (association sonore).', [['pluja', 'pluie'], ['moll / eixut', 'mouillé / sec'], ['vent lateral', 'vent de côté']], ['Menys… més…', 'menys = moins · més = plus. Les effets peuvent aller dans des sens opposés.', 'Amb pluja, menys adherència i més distància de frenada.', 'Avec la pluie, moins d’adhérence et plus de distance de freinage.']),
    page('Neige, verglas et descente', 'DOUCEUR AVANT TOUT', [
      '**Neu** = neige. **Gel** = glace / verglas. Réduire la vitesse et augmenter fortement les distances.',
      'Sur sol glissant : accélérer, tourner et freiner **en douceur**.',
      'Avant un virage : **ralentir avant d’entrer**, sans attendre le milieu.',
      'En descente : rapport adapté et **frein moteur**. Pas de descente au point mort.',
      'Du **1er novembre au 15 mai** : emporter des chaînes prêtes à servir, sauf pneus hiver ou M+S.',
      'Chaussée enneigée/verglacée : équipements adaptés obligatoires selon les conditions et consignes. **Pas de chaînes sur route dégagée**.'
    ], 'Mémo : GEL se lit comme en français. BAIXADA : pense « bas » pour la descente.', [['neu / gel', 'neige / verglas'], ['cadenes', 'chaînes'], ['punt mort', 'point mort']], ['Llevat que…', 'llevat que = sauf si. La suite indique l’exception.', 'Cal portar cadenes, llevat que portem pneumàtics d’hivern o M+S.', 'Il faut emporter des chaînes, sauf si l’on a des pneus hiver ou M+S.'])
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
      'Fatigue, somnolence, maladie : **attention et réaction diminuent**.',
      'Bâillements, paupières lourdes : chercher un endroit **sûr pour s’arrêter et se reposer**.',
      'Ouvrir la fenêtre ou monter la musique **ne remplace pas le repos**.',
      'Téléphone et distractions : les yeux quittent la route, le danger arrive **avant ta réaction**.',
      'Un médicament peut altérer la conduite : **lire la notice et demander conseil**.',
      'Conduite prévisible : annoncer ses intentions, garder une marge, **ne pas surprendre les autres**.'
    ], 'Mémo : CANSAMENT → pense « quand ça fatigue ». SON = envie de dormir, pas le bruit.', [['cansament', 'fatigue'], ['son', 'sommeil / somnolence'], ['descansar', 'se reposer']], ['Tenir son', 'tenir = avoir. « Tinc son » signifie « j’ai sommeil ».', 'Si tinc son, he de parar en un lloc segur.', 'Si j’ai sommeil, je dois m’arrêter dans un endroit sûr.']),
    page('Alcool : les bons repères', '0,5 g/l · CATÉGORIES À 0,0 g/l', [
      'Limite générale : **0,5 g d’alcool par litre de sang**. Ce n’est pas un objectif à atteindre.',
      '**0,0 g/l** pour les catégories visées : notamment urgences, transport de passagers, marchandises > 3 500 kg, matières dangereuses et véhicules spéciaux.',
      '**Même une petite dose** peut dégrader la conduite. Le choix le plus sûr : ne pas boire avant de conduire.',
      '**0,8 g/l n’est pas la limite autorisée.** Ne pas mélanger les seuils.',
      'Après un accident, le contrôle peut concerner **tout usager impliqué**, pas seulement le responsable présumé.',
      'Résultat contesté : possibilité de demander une **analyse de sang de contrôle**. Cela n’annule pas automatiquement le résultat.'
    ], 'Mémo : SANG s’écrit comme en français. TAXA = taux ; ne pense pas à une taxe à payer.', [['taxa', 'taux'], ['prova', 'test / épreuve'], ['qualsevol', 'n’importe quel / tout']], ['No superior a…', 'no superior a = ne dépassant pas. C’est un plafond, pas une permission de le dépasser un peu.', 'Una taxa no superior a 0,5 g/l.', 'Un taux ne dépassant pas 0,5 g/l.'])
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
      '**Transmission** : transmet le mouvement du moteur aux roues motrices.',
      '**Embragatge** = embrayage. Pédale enfoncée : débrayé ; relâchée : embrayé.',
      '**Roues motrices** : reçoivent la force du moteur. **Directrices** : orientent la trajectoire.',
      '**Fre de servei** : frein à pédale. **Fre d’estacionament** : immobilise le véhicule garé.',
      'Pneus : contrôler pression **à froid**, selon le constructeur, et surveiller l’usure.',
      'Usure irrégulière ou vibrations : faire vérifier le véhicule. **Entretenir = prévenir les accidents**.'
    ], 'Mémo : EMBRAGATGE → embrayage. RODES → roues. Les deux familles de mots sont proches.', [['roda / pneumàtic', 'roue / pneu'], ['desgast', 'usure'], ['fre', 'frein']], ['Premut / lliure', 'premut = enfoncé · lliure = libre / relâché. Les états changent le sens.', 'Pedal premut: desembragat. Pedal lliure: embragat.', 'Pédale enfoncée : débrayé. Pédale relâchée : embrayé.']),
    page('Conduire souplement, consommer moins', 'ANTICIPER > ACCÉLÉRER / FREINER', [
      '**Anticiper** limite les accélérations et freinages inutiles.',
      'Utiliser un **rapport adapté**, plutôt long quand le moteur le permet.',
      'Bagages : le **coffre** dégrade moins l’aérodynamisme que la galerie.',
      'Charge inutile, galerie et vitres ouvertes à vitesse élevée peuvent **augmenter la consommation**.',
      'En descente : garder une vitesse engagée pour le **frein moteur**. Ne pas couper le contact ni rouler au point mort.',
      'Freiner continuellement peut **surchauffer les freins** et réduire leur efficacité.'
    ], 'Mémo : ESTALVIAR = économiser. Imagine une tirelire « estalvi » : moins d’à-coups, moins de carburant.', [['estalviar', 'économiser'], ['maleter / baca', 'coffre / galerie'], ['marxa llarga', 'rapport long']], ['Perquè…', 'perquè = parce que dans une explication. Il introduit la raison.', 'El maleter és preferible perquè redueix la resistència a l’aire.', 'Le coffre est préférable parce qu’il réduit la résistance de l’air.'])
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
      'Voiture équipée de ceintures : **conducteur et passagers attachés**, en ville comme sur route, hors exemptions légales.',
      'La ceinture arrière n’est **pas une simple recommandation**.',
      'Voiture jusqu’à 9 places : enfant **de moins de 10 ans ET de moins de 1,50 m** → siège adapté, normalement à l’arrière.',
      'Siège enfant : homologué, adapté à **taille et poids**, installé selon le fabricant.',
      'Moto ordinaire : conducteur et passager portent un **casque attaché et des gants adaptés**.',
      'Ne pas transporter plus de personnes que de **places autorisées**.'
    ], 'Mémo : CINTURÓ ressemble à ceinture. CASC ressemble à casque. CORDAT = attaché, pense à une corde.', [['cinturó', 'ceinture'], ['seient', 'siège'], ['casc cordat', 'casque attaché']], ['Tant… com…', 'tant… com… = aussi bien… que… Les deux groupes sont concernés.', 'Tant el conductor com els passatgers han de portar cinturó.', 'Aussi bien le conducteur que les passagers doivent porter la ceinture.']),
    page('Fixer la charge et dégager la vue', 'ATTACHÉ · STABLE · VISIBLE', [
      'Chargement **bien fixé** : ne doit ni tomber ni glisser au freinage.',
      'Préserver **stabilité et visibilité** du conducteur.',
      'Ne masquer **ni feux, ni plaque d’immatriculation, ni signaux du véhicule**.',
      'Répartir la charge. Respecter les **masses et dimensions autorisées**.',
      'Charger/décharger : **moteur coupé**, si possible hors voie publique ; sinon côté trottoir.',
      '**Pes** = poids · **amplada** = largeur · **llargada** = longueur · **sobresortir** = dépasser du gabarit.'
    ], 'Mémo : AMPLADA → amplitude en largeur. LLARGADA → quelque chose qui s’allonge.', [['càrrega', 'chargement'], ['lligada', 'attachée'], ['matrícula', 'immatriculation / plaque']], ['Ni… ni…', 'ni… ni… fonctionne comme en français. Aucun des éléments ne doit être masqué.', 'La càrrega no pot tapar ni els llums ni la matrícula.', 'Le chargement ne peut masquer ni les feux ni la plaque.'])
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
      '**Permís de conduir** : autorise la personne à conduire les catégories concernées.',
      '**Certificat de matrícula / permís de circulació** : identifie le véhicule et autorise sa circulation.',
      '**Assegurança** : assurance. La responsabilité civile couvre les **dommages aux tiers**.',
      '**ITV** : contrôle technique. Il vérifie l’état réglementaire du véhicule.',
      'Présenter les documents exigibles : permis, immatriculation, **assurance valide**, ITV si applicable.',
      'L’assurance ne remplace **ni le permis ni le contrôle technique**.'
    ], 'Mémo : CONDUIR → conducteur. CIRCULACIÓ → circulation du véhicule. ASSEGURANÇA → assurance.', [['vigent', 'en cours de validité'], ['danys a tercers', 'dommages aux tiers'], ['exhibir', 'présenter']], ['Si escau', 'si escau = le cas échéant / si cela s’applique. Ce n’est pas « si tu en as envie ».', 'El certificat de la ITV, si escau.', 'Le certificat de contrôle technique, le cas échéant.']),
    page('Lire les limites sans se tromper', 'PERSONNES · POIDS · VALIDITÉ', [
      'Permis B : **9 personnes maximum, conducteur compris**.',
      '**MMA** = masse maximale autorisée. Ce n’est pas le poids à vide.',
      '**Pes en buit** = poids à vide. **Remolc** = remorque ; vérifier l’autorisation de l’ensemble.',
      'Les catégories ne donnent pas toutes les mêmes droits : vérifier **véhicule + remorque + places**.',
      '**Vigent** = valide. Un document périmé n’est pas « en vigueur ».',
      'ITV : respecter l’échéance propre au véhicule. Une ITV valide **n’exclut pas un contrôle des émissions**.'
    ], 'Mémo : « incloent-hi » → INCLUANT. Dans 9 places, compte-toi : toi + 8 passagers.', [['incloent-hi', 'y compris'], ['pes en buit', 'poids à vide'], ['remolc', 'remorque']], ['Fins a / més de', 'fins a = jusqu’à, limite incluse · més de = plus de, limite exclue.', 'Fins a nou persones, incloent-hi el conductor.', 'Jusqu’à neuf personnes, conducteur compris.'])
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
      '**Protéger** : s’arrêter sans créer de danger, si possible hors chaussée.',
      '**Gilet réfléchissant** si l’on occupe la chaussée. Signaler le danger sans s’exposer.',
      '**Alerter** les secours ou la police. Donner le lieu précis, les dangers, les véhicules et blessés.',
      '**Secourir** : aider dans la limite de ses capacités et suivre les instructions des secours.',
      'Accident avec blessés : **rester disponible sur place**, sauf nécessité de partir chercher de l’aide.',
      'Ne pas modifier les lieux inutilement. **La sécurité des personnes passe d’abord**.'
    ], 'Mémo PAS, en français : Protéger → Alerter → Secourir. En catalan : protegir → avisar → socórrer.', [['armilla reflectant', 'gilet réfléchissant'], ['avisar', 'alerter'], ['ferit', 'blessé']], ['Primer / després', 'primer = d’abord · després = ensuite. L’ordre des gestes compte.', 'Primer protegim; després avisem.', 'D’abord nous protégeons ; ensuite nous alertons.']),
    page('Donner les bonnes informations', 'OÙ ? QUOI ? COMBIEN ?', [
      '**On?** = où ? **Què?** = quoi ? **Quants?** = combien ? Utiles pour comprendre l’alerte.',
      '**Ferit** = blessé ; **inconscient** = inconscient ; **respira** = respire.',
      'Décrire ce que l’on observe. **Suivre les consignes des secours** plutôt qu’improviser.',
      'Présignalisation de danger : doit être **visible à au moins 100 m**. Visibilité ≠ distance de pose.',
      'Accident avec seulement des dégâts matériels : prévenir les assureurs dans un maximum de **8 jours calendaires**.',
      '**Dies naturals** : week-ends et jours fériés inclus. **Danys materials** : dégâts matériels.'
    ], 'Mémo : FERIT → pense à « une blessure qui fait souffrir ». AVISAR → donner un avis d’alerte.', [['romandre', 'rester'], ['avaria', 'panne'], ['dies naturals', 'jours calendaires']], ['Com a mínim / com a màxim', 'mínim = au moins · màxim = au plus. Vérifie le mot avant de choisir un nombre.', 'Visible a cent metres com a mínim.', 'Visible à cent mètres au minimum.'])
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
      '**Cal frenar** = il faut freiner. **No cal frenar** = pas besoin de freiner.',
      '**No es pot frenar** = on ne peut pas freiner. Dans une règle : c’est interdit.',
      '**Només** = seulement. **Llevat de** = sauf. Ils limitent la règle.',
      '**No… cap** = aucun : no hi ha cap vehicle = il n’y a aucun véhicule.',
      '**Mai** = jamais. **Sempre** = toujours. **En cap cas** = en aucun cas.',
      '**Sempre que**, dans une condition = à condition que. Selon le contexte : chaque fois que.'
    ], 'Mémo : NO CAL enlève le besoin. NO ES POT ferme la porte. Deux panneaux mentaux différents : « facultatif » / « interdit ».', [['només', 'seulement'], ['llevat de', 'sauf'], ['cap vehicle', 'aucun véhicule (avec no)']], ['Repérer le petit mot', 'Lire la négation avant le reste. Une phrase proche peut avoir un sens opposé.', 'No cal parar. / No es pot parar.', 'Il n’est pas nécessaire de s’arrêter. / On ne peut pas s’arrêter.']),
    page('Quantités, causes et petits pièges', 'PLUS ≠ MOINS · POURQUOI ≠ PARCE QUE', [
      '**Més de** = plus de. **Menys de** = moins de. **Fins a** = jusqu’à, inclus.',
      '**Almenys / com a mínim** = au moins. **Com a màxim** = au maximum.',
      '**Prou** = assez. **Massa** = trop, devant un adjectif : massa ràpid = trop vite.',
      '**Per què?** = pourquoi ? **Perquè** = parce que dans une réponse.',
      '**Per tant** = donc. **Ja que** = puisque / car.',
      '**Cap a** = vers. **El cap** = la tête. Ce n’est pas le cap de « aucun véhicule ».'
    ], 'Mémo : MÉS → « mets-en plus ». MENYS → « moins ». PER QUÈ séparé pose la question ; PERQUÈ collé donne la raison.', [['prou / massa', 'assez / trop'], ['cap a', 'vers'], ['per tant', 'donc']], ['Du nombre à l’inégalité', 'més de 50 : 50 exclu · fins a 50 : 50 inclus · almenys 50 : 50 ou plus.', 'Fins a nou persones.', 'Jusqu’à neuf personnes, neuf compris.'])
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
      '**Aturar-se / parar-se / detenir-se** = s’arrêter. Trois formes pour le même geste.',
      '**Comprovar** = vérifier. **Comprar** = acheter. Le V te dit : **Vérifie !**',
      '**Girar** = tourner. **Avançar** = dépasser. **Frenar** = freiner.',
      '**Reduir / augmentar** = réduire / augmenter. Ils changent la vitesse ou la distance.',
      '**Encendre / apagar** = allumer / éteindre. **Senyalitzar** = signaler.',
      '**Acostar-se / atansar-se** = s’approcher. **Trobar-se** = se trouver.'
    ], 'Mémo : FRE(NAR) → freiner. GIRA(R) → giratoire, ça tourne. Dans COMPROVAR, le V est celui de VÉRIFIER.', [['aturar-nos', 'nous arrêter'], ['comprovar', 'vérifier'], ['acostar-nos', 'nous approcher']], ['-se / -nos', 'Après l’infinitif, le pronom se colle : -se = se · -nos = nous.', 'Hem d’aturar-nos.', 'Nous devons nous arrêter.']),
    page('Décoder sans tout traduire', 'QUAND ? → CONDITION → ACTION', [
      '**Hem de** = nous devons. **Podem** = nous pouvons. **Caldrà** = il faudra.',
      '**Abans de** = avant de. **Després de** = après. **En + infinitif** = en faisant / au moment de.',
      '**Hi ha** = il y a. **No hi ha** = il n’y a pas.',
      '**Si cal** = si nécessaire. **Sense** = sans. **Amb** = avec.',
      '**Què?** = quoi ? **Quan?** = quand ? **On?** = où ? **Com?** = comment ?',
      'Exemple : **En acostar-nos** (en approchant) **a una cruïlla** (d’un carrefour), **hem de mirar** (nous devons regarder).'
    ], 'Mémo : QUAN contient le début de QUAND. ON en catalan demande OÙ. Cherche d’abord le verbe : le reste précise quand et comment.', [['abans / després', 'avant / après'], ['amb / sense', 'avec / sans'], ['hi ha', 'il y a']], ['Une phrase en trois blocs', 'Moment → lieu → action. Pas besoin de connaître tous les mots pour repérer la structure.', 'En acostar-nos a una cruïlla, hem de mirar.', 'En nous approchant d’un carrefour, nous devons regarder.'])
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
  ])
];

export const memoryAids: Record<string, string> = {
  routes: 'CARRIL → imagine un rail qui guide ta file. CARRER → la rue. CARRETERA → la route.',
  priorites: 'DRETA → droite. ESQUERRA → imagine une équerre posée à gauche (association visuelle).',
  manoeuvres: 'SENTIT → sens. DIRECCIÓ → direction. Tourner dans une rue ne veut pas forcément dire repartir en sens inverse.',
  depassements: 'AVANÇAR → passer à l’avant. SOBRESORTIR → quelque chose qui sort du véhicule.',
  stationnement: 'PARADA → pause passager. ESTACIONAMENT → je stationne. DETENCIÓ → je suis retenu par la circulation.',
  eclairage: 'ENCREUAMENT → croisement. CARRETERA → route. Les noms français des feux sont déjà presque là.'
};
