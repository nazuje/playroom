import { animal, type TranslatedPlace } from './place.ts';

export const SL_AFRICA: Record<string, TranslatedPlace> = {
  sahara: {
    name: 'Puščava Sahara',
    description: 'Največja vroča puščava na svetu, z ogromnimi peščenimi sipinami, skalnatimi gorami in skoraj brez dežja.',
    animals: {
      dromedary: animal(
        'Kamela',
        ['Po vročem pesku prehodim dolgo pot.', 'Veliko dni zdržim brez vode.', 'Sem kamela z eno grbo.'],
        'Kamelja grba je polna maščobe, ne vode, in ji daje moč, ko je hrane malo.',
      ),
      'fennec-fox': animal(
        'Fenek',
        [
          'Sem majhen in čez vroč dan spim v hladnem rovu.',
          'Dlaka na tacah me varuje, da se ne opečem na vročem pesku.',
          'Sem drobcena lisička z OGROMNIMI ušesi!',
        ],
        'Fenek z ogromnimi ušesi sliši žuželke, ki se premikajo pod zemljo, ušesa pa ga tudi hladijo.',
      ),
      addax: animal(
        'Adaks',
        [
          'Živim v najglobljih, najbolj peščenih delih puščave.',
          'Skoraj nikoli ne pijem, ker dobim vodo iz rastlin.',
          'Sem bleda antilopa z dolgimi zavitimi rogovi.',
        ],
        'Adaksi imajo široka, ploščata kopita, s katerimi hodijo po mehkem pesku, ne da bi se ugreznili.',
      ),
      'dorcas-gazelle': animal(
        'Gazela dorkas',
        [
          'Sem majhna, urna in elegantna.',
          'Večino vode dobim iz rastlin, ki jih jem.',
          'Sem majhna gazela barve peska.',
        ],
        'Ko gazelo dorkas nekdo lovi, visoko poskakuje na trdih nogah, da pokaže, kako močna in hitra je.',
      ),
      'sand-cat': animal(
        'Peščena mačka',
        [
          'Sem majhna in lovim ponoči.',
          'Gost kožuh na tacah me varuje pred vročim peskom.',
          'Videti sem kot mala domača muca, ampak živim v puščavi!',
        ],
        'Peščene mačke zdržijo mesece brez pitja, ker dobijo vodo iz hrane.',
      ),
      deathstalker: animal(
        'Rumeni škorpijon',
        ['Imam osem nog.', 'Rep držim visoko nad hrbtom.', 'Sem rumen škorpijon z želom!'],
        'Kot vsi škorpijoni tudi ta pod posebno ultravijolično lučjo sveti modrozeleno!',
      ),
      'lesser-egyptian-jerboa': animal(
        'Puščavski skakač',
        [
          'Sem drobcen in ven pridem ponoči.',
          'Imam dolg rep s čopkom na koncu.',
          'Na dolgih zadnjih nogah skačem kot mini kenguru!',
        ],
        'Puščavski skakači čez dan zamašijo vhod v rov, da vročina ne pride noter.',
      ),
    },
  },
  'african-savanna': {
    name: 'Afriška savana',
    description: 'Široke travnate planjave z redkimi akacijami, dom največjih afriških živali.',
    animals: {
      'african-bush-elephant': animal(
        'Afriški slon',
        [
          'Sem zelo velik in rad čofotam po blatu.',
          'Z dolgim nosom pijem, jem in pozdravljam.',
          'Sem največja kopenska žival na Zemlji, z ogromnimi plahutajočimi ušesi!',
        ],
        'Sloni mahajo z velikimi ušesi, da se ohladijo, kot z velikansko pahljačo.',
      ),
      lion: animal(
        'Lev',
        [
          'Živim v družini, ki ji pravimo krdelo.',
          'Spim do dvajset ur na dan.',
          'Sem velika mačka, samci pa imajo košato grivo.',
        ],
        'Levje rjovenje se sliši do osem kilometrov daleč!',
      ),
      giraffe: animal(
        'Žirafa',
        ['Jem listje z vrhov dreves.', 'Moj jezik je dolg in temno modro vijoličen.', 'Sem najvišja žival na svetu!'],
        'Žirafa ima zelo dolg vrat, a v njem enako število vretenc kot ti: sedem!',
      ),
      'plains-zebra': animal(
        'Zebra',
        ['Živim v veliki čredi in jem travo.', 'Zelo sem podobna konju.', 'Imam črne in bele proge!'],
        'Nobeni dve zebri nimata čisto enakih prog, tako kot prstni odtisi.',
      ),
      hippopotamus: animal(
        'Povodni konj',
        [
          'Dneve preživim v rekah in jezerih.',
          'Ponoči pridem ven jest travo.',
          'Sem velik in okrogel, z ogromnimi usti, in v imenu imam besedo konj!',
        ],
        'Povodni konji pravzaprav ne znajo plavati. Po dnu reke hodijo ali poskakujejo.',
      ),
      cheetah: animal(
        'Gepard',
        [
          'Sem mačka s črnimi pikami.',
          'Od oči navzdol imam črni črti, kot sledi solz.',
          'Sem najhitrejša kopenska žival na svetu!',
        ],
        'Gepard lahko iz mirovanja v približno treh sekundah pospeši do sto kilometrov na uro!',
      ),
      'common-ostrich': animal(
        'Noj',
        [
          'Imam dolge noge in tečem res hitro.',
          'Ležem največja jajca na svetu.',
          'Sem največja ptica na svetu in ne znam leteti.',
        ],
        'Nojevo oko je večje od njegovih možganov!',
      ),
      'blue-wildebeest': animal(
        'Gnu',
        [
          'Živim v ogromni čredi.',
          'Vsako leto nas milijoni potujejo v velikem krogu, da najdemo svežo travo.',
          'Videti sem kot krava z brado in ukrivljenimi rogovi.',
        ],
        'Mladički gnujev znajo stati in teči že nekaj minut po rojstvu.',
      ),
    },
  },
  'congo-rainforest': {
    name: 'Kongovski deževni gozd',
    description: 'Ogromna, soparna afriška džungla, kjer se med drevesi vije velikanska reka.',
    animals: {
      'western-lowland-gorilla': animal(
        'Gorila',
        [
          'Živim v družini, ki jo vodi velik, močan očka.',
          'Hodim po členkih.',
          'Sem največja človeška opica, odrasli očki pa imajo srebrn hrbet.',
        ],
        'Gorile si vsak večer naredijo svežo posteljo iz listja.',
      ),
      okapi: animal(
        'Okapi',
        [
          'Sem plah in se skrivam globoko v gozdu.',
          'Imam dolg moder jezik, s katerim si obližem ušesa.',
          'Noge imam progaste kot zebra, sem pa žirafin bratranec!',
        ],
        'Okapija je bilo tako težko najti, da so znanstveniki zanj izvedeli šele pred dobrimi sto leti!',
      ),
      bonobo: animal(
        'Bonobo',
        [
          'Sem opica, ki živi v veliki, prijazni skupini.',
          'Nekaj časa znam hoditi po dveh nogah.',
          'Podoben sem šimpanzu, a sem bolj vitek in imam prečko na glavi.',
        ],
        'Bonobi živijo samo v eni državi na svetu: v Demokratični republiki Kongo.',
      ),
      'african-forest-elephant': animal(
        'Gozdni slon',
        [
          'Sem velik, a živim med drevesi.',
          'Imam majhna okrogla ušesa in ravne okle.',
          'Sem manjši slon, ki živi v deževnem gozdu.',
        ],
        'Gozdni sloni so vrtnarji deževnega gozda: jedo sadje in raznašajo semena, da zrastejo nova drevesa.',
      ),
      'grey-parrot': animal(
        'Sivi papagaj',
        [
          'Živim v glasnih jatah.',
          'Zelo sem pameten in znam posnemati zvoke.',
          'Sem siv papagaj s svetlo rdečim repom.',
        ],
        'Sivi papagaji so odlični govorci. Eden, ki so mu rekli Aleks, se je naučil več kot sto besed!',
      ),
      mandrill: animal(
        'Mandril',
        [
          'Živim v veliki skupini na gozdnih tleh.',
          'Prigrizke shranjujem v vrečkah v licih.',
          'Sem opica s pisanim rdeče-modrim obrazom!',
        ],
        'Mandrili z najbolj pisanim obrazom so v skupini najpomembnejši.',
      ),
      chimpanzee: animal(
        'Šimpanz',
        [
          'Zelo sem pameten in živim v družinski skupini.',
          'S palicami kot z orodjem lovim termite.',
          'Sem človeška opica in eden tvojih najbližjih živalskih sorodnikov.',
        ],
        'Šimpanzi se po prepiru objamejo in poljubijo, da se spet spoprijateljijo.',
      ),
      'goliath-frog': animal(
        'Goljatska žaba',
        [
          'Živim ob deročih rekah.',
          'Daleč skočim in sem skoraj tako težka kot domača muca.',
          'Sem največja žaba na svetu!',
        ],
        'Goljatske žabe premikajo kamne in tako svojim paglavcem gradijo majhne ribnike.',
      ),
    },
  },
  madagascar: {
    name: 'Madagaskar',
    description: 'Velik otok ob Afriki, kjer večina živali ne živi nikjer drugje na svetu.',
    animals: {
      'ring-tailed-lemur': animal(
        'Lemur kata',
        [
          'Rad se sončim z razširjenimi rokami.',
          'Živim v veliki skupini, ki jo vodijo samice.',
          'Imam dolg črno-bel progast rep!',
        ],
        'Lemurji kata imajo smrdljive boje: drug proti drugemu mahajo s smrdljivimi repi!',
      ),
      fossa: animal(
        'Fosa',
        [
          'Rada lovim in odlično plezam po drevesih.',
          'Gležnje lahko obrnem, zato se z drevesa spustim z glavo naprej.',
          'Videti sem kot mešanica mačke in mungosa.',
        ],
        'Fosa je največja mesojeda žival na Madagaskarju, najraje pa ima lemurje.',
      ),
      'aye-aye': animal(
        'Aj-aj',
        [
          'Ven pridem ponoči.',
          'Trkam po drevesih in poslušam, kje se notri skrivajo žuželke.',
          'Imam velike oči, velika ušesa in en zelo dolg, tanek sredinec!',
        ],
        'Aj-aj je največji primat na svetu, ki je buden ponoči.',
      ),
      'panther-chameleon': animal(
        'Panterski kameleon',
        [
          'Počasi se premikam po vejah.',
          'Z očmi lahko hkrati gledam v dve različni smeri.',
          'Sem kuščar, ki spreminja barve!',
        ],
        'Kameleonov jezik lahko švigne dlje, kot je dolgo njegovo celo telo, in ujame žuželko.',
      ),
      'verreauxs-sifaka': animal(
        'Plešoča sifaka',
        [
          'Živim na drevesih in skačem z debla na deblo.',
          'Na tleh poskakujem postrani, kot da plešem.',
          'Sem bel lemur s temnim obrazom.',
        ],
        'Sifake lahko z enega drevesa na drugo skočijo kar deset metrov daleč!',
      ),
      indri: animal(
        'Indri',
        [
          'Živim visoko na drevesih deževnega gozda.',
          'Moja družina vsako jutro glasno poje.',
          'Sem največji lemur, črno-bel in skoraj brez repa.',
        ],
        'Pesmi indrijev se slišijo več kot dva kilometra daleč.',
      ),
      'hissing-cockroach': animal(
        'Sikajoči ščurek',
        [
          'Živim na gozdnih tleh in jem odpadlo sadje.',
          'Sploh nimam kril.',
          'Ko me kaj preseneti, izpihnem zrak in glasno zasikam!',
        ],
        'Ta ščurek sika tako, da stisne zrak skozi drobne luknjice za dihanje ob telesu.',
      ),
      'lowland-streaked-tenrec': animal(
        'Progasti tenrek',
        [
          'Sem majhen in bodičast.',
          'Drgnem posebne bodice na hrbtu, da brenčijo.',
          'Videti sem kot črno-rumen progast jež.',
        ],
        'Progasti tenreki so edini znani sesalci, ki se pogovarjajo z drgnjenjem bodic.',
      ),
    },
  },
};
