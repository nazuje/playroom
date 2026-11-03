import { animal, type TranslatedPlace } from './place.ts';

const GREEN_TURTLE_CLUES = [
  'Plavam v toplih morjih.',
  'Mamice ponoči prilezejo na peščene plaže, da izležejo jajca.',
  'Sem velika morska želva in rada jem morsko travo.',
] as const;

export const SL_OCEANIA: Record<string, TranslatedPlace> = {
  'australian-outback': {
    name: 'Avstralska divjina',
    description: 'Ogromna, vroča, rdeča dežela v osrčju Avstralije, s skalnatimi griči in suho travo.',
    animals: {
      'red-kangaroo': animal(
        'Rdeči kenguru',
        [
          'Skačem na velikih zadnjih nogah.',
          'Močan rep mi služi kot dodatna noga.',
          'Sem največji kenguru, mamice pa nosijo mladičke v vrečki.',
        ],
        'Rdeči kenguru lahko v enem samem skoku skoči kar osem metrov daleč!',
      ),
      emu: animal(
        'Emu',
        [
          'Sem velika ptica, ki ne zna leteti.',
          'Očki valijo jajca in skrbijo za mladiče.',
          'Sem druga najvišja ptica na svetu in prihajam iz Avstralije.',
        ],
        'Emujeva jajca so temno zelena, kot velikanski avokadi!',
      ),
      'thorny-devil': animal(
        'Trnasti hudiček',
        [
          'Sem majhen kuščar, ves pokrit z bodicami.',
          'Vsak dan pojem na tisoče drobnih mravelj.',
          'V imenu imam hudička, sem pa nenevaren, bodičast kuščar!',
        ],
        'Trnasti hudiček lahko pije kar tako, da stoji na vlažnem pesku: voda mu po drobnih žlebičkih na koži priteče do ust.',
      ),
      dingo: animal(
        'Dingo',
        [
          'Lovim sam ali z družinskim tropom.',
          'Zavijam, lajam pa skoraj nikoli.',
          'Sem avstralski divji pes, ponavadi barve peska.',
        ],
        'Dingi imajo zelo gibljiva zapestja, s katerimi plezajo po drevesih in ograjah.',
      ),
      'greater-bilby': animal(
        'Bilbi',
        [
          'Ponoči pridem ven in kopljem za hrano.',
          'Moja vrečka je obrnjena nazaj, da mi pri kopanju ne pride vanjo zemlja.',
          'Imam dolga ušesa kot zajček in dolg koničast nos.',
        ],
        'V Avstraliji nekateri namesto velikonočnega zajčka praznujejo z velikonočnim bilbijem!',
      ),
      'short-beaked-echidna': animal(
        'Kljunati ježek',
        [
          'Pokrit sem z bodicami.',
          'Mravlje lovim z dolgim, lepljivim jezikom.',
          'Sem bodičast sesalec, ki leže jajca!',
        ],
        'Mladiček kljunatega ježka se izvali iz jajčka, ki je majhno kot grozdna jagoda.',
      ),
      budgerigar: animal(
        'Skobčevka',
        [
          'Letam v velikih, glasnih jatah.',
          'Sem majhna papiga.',
          'Sem zelena in rumena in veliko ljudi me ima doma.',
        ],
        'Divje skobčevke letijo v ogromnih jatah s tisoči ptic in skupaj iščejo vodo.',
      ),
      'frill-necked-lizard': animal(
        'Kuščar ovratničar',
        [
          'Rad sedim na drevesih.',
          'Ko me je strah, zbežim po zadnjih nogah.',
          'Okoli vratu razprem velikanski ovratnik, da sem videti strašen!',
        ],
        'Ovratnik kuščarja ovratničarja se lahko razpre tako na široko kot krožnik.',
      ),
    },
  },
  'australian-east-coast': {
    name: 'Gozdovi vzhodne Avstralije',
    description: 'Deževni gozdovi, evkaliptovi gozdovi in peščene plaže ob zeleni vzhodni obali Avstralije.',
    animals: {
      koala: animal(
        'Koala',
        [
          'Spim do dvajset ur na dan.',
          'Jem samo evkaliptove liste.',
          'Sem puhasta siva žival, ki objema drevesa, a nisem medved!',
        ],
        'Koale imajo prstne odtise skoraj čisto enake kot ljudje.',
      ),
      platypus: animal(
        'Kljunaš',
        [
          'Plavam v rekah in potokih.',
          'Pod vodo zaprem oči in hrano najdem tako, da čutim drobne električne signale.',
          'Imam račji kljun in bobrov rep, pa še jajca ležem!',
        ],
        'Pod posebno ultravijolično lučjo kljunaševa dlaka sveti modrozeleno!',
      ),
      'southern-cassowary': animal(
        'Kazuar',
        [
          'Sem velika ptica, ki ne zna leteti.',
          'Na glavi imam visoko čelado.',
          'Imam svetlo moder vrat in rdeče podbradke, ki bingljajo.',
        ],
        'Kazuarji jedo odpadlo sadje in raznašajo semena, da deževni gozd raste.',
      ),
      'laughing-kookaburra': animal(
        'Kukabura',
        [
          'Sem velika ptica iz družine vodomcev.',
          'Lovim kuščarje, kače in žuželke.',
          'Moj klic zveni kot glasen smeh!',
        ],
        'Kukabure se zjutraj in zvečer smejijo skupaj, da drugim pticam povedo: tukaj je naš dom!',
      ),
      'tasmanian-devil': animal(
        'Tasmanski vrag',
        [
          'Sem majhen in močan in ven pridem ponoči.',
          'Glasno kričim in renčim.',
          'Sem črna žival s Tasmanije, po meni pa je dobil ime slaven junak iz risank.',
        ],
        'Tasmanski vragi imajo glede na svojo velikost enega najmočnejših ugrizov med sesalci.',
      ),
      'common-wombat': animal(
        'Vombat',
        [
          'Sem čokata žival, ki koplje rove.',
          'Moja zadnjica je tako trda, da z njo kot z vrati zaprem rov.',
          'Sem kosmata avstralska žival s kratkimi nogami in velikim nosom.',
        ],
        'Vombati delajo kakce v obliki kock, česar ne zna nobena druga znana žival!',
      ),
      'sugar-glider': animal(
        'Jadralni posum',
        [
          'Sem majhen in ven pridem ponoči.',
          'Obožujem sladek drevesni sok in nektar.',
          'Med drevesi jadram z raztegljivo kožo, kot s padalom.',
        ],
        'Jadralni posum lahko odjadra petdeset metrov daleč, kot je dolg olimpijski bazen!',
      ),
      'superb-lyrebird': animal(
        'Lirorepec',
        [
          'Živim na gozdnih tleh.',
          'Posnemam skoraj vsak zvok, ki ga slišim, celo fotoaparate in avtomobilske alarme!',
          'Samci imajo čudovit rep v obliki harfe.',
        ],
        'Lirorepci so med najboljšimi posnemovalci na svetu in posnemajo pesmi mnogih drugih ptic.',
      ),
    },
  },
  'new-zealand': {
    name: 'Nova Zelandija',
    description: 'Zeleni otoki z gorami, gozdovi in plažami, dom ptic, ki jih ni nikjer drugje.',
    animals: {
      kiwi: animal(
        'Kivi',
        [
          'Sem ptica, ki ne zna leteti.',
          'Nosnice imam na konici dolgega kljuna, da izvoham deževnike.',
          'Sem okrogla, rjava, puhasta ptica, po meni pa so dobili vzdevek Novozelandci!',
        ],
        'Kivijevo jajce je ogromno, tehta približno petino mamice!',
      ),
      kea: animal(
        'Kea',
        [
          'Sem ptica iz zasneženih gora.',
          'Zelo sem radovedna in rada stvari razdiram, celo dele avtomobilov!',
          'Sem zelena papiga z oranžnim perjem pod perutmi.',
        ],
        'Kee so edine papige na svetu, ki živijo visoko v zasneženih gorah.',
      ),
      kakapo: animal(
        'Kakapo',
        [
          'Sem velika, debelušna papiga.',
          'Ne znam leteti, znam pa plezati po drevesih.',
          'Sem zelena nočna papiga, ki diši malo po medu!',
        ],
        'Kakapoji so najtežje papige na svetu, in vsak med njimi ima svoje ime!',
      ),
      tuatara: animal(
        'Tuatara',
        [
          'Videti sem kot kuščar, a nisem.',
          'Moja družina živi na svetu že od časa dinozavrov.',
          'Po hrbtu imam bodice in živim samo na Novi Zelandiji.',
        ],
        'Mlade tuatare imajo na vrhu glave tretje oko, ki ga med rastjo prekrije koža.',
      ),
      'hectors-dolphin': animal(
        'Hectorjev delfin',
        [
          'Plavam blizu obale.',
          'Sem majhen in siv, s črnimi in belimi lisami.',
          'Sem eden najmanjših delfinov, z okroglo plavutjo kot uho Mikija Miške.',
        ],
        'Hectorjevi delfini živijo samo v morju okoli Nove Zelandije.',
      ),
      'yellow-eyed-penguin': animal(
        'Rumenooki pingvin',
        [
          'Ne znam leteti, znam pa plavati.',
          'Gnezdim v gozdovih blizu plaže, ne v velikih gručah.',
          'Sem pingvin s svetlo rumenimi očmi.',
        ],
        'Rumenooki pingvin je eden najredkejših pingvinov na svetu.',
      ),
      'new-zealand-fur-seal': animal(
        'Morski medved',
        [
          'Rad imam skalnate plaže.',
          'Imam majhna uhlja in znam hoditi po plavutih.',
          'Sem kosmat tjulenj z Nove Zelandije.',
        ],
        'Mladi morski medvedi se skupaj igrajo v skalnih tolmunih in slapovih, ko so njihove mamice na morju.',
      ),
      takahe: animal(
        'Takahe',
        [
          'Sem ptica, ki ne zna leteti.',
          'Ljudje so mislili, da me ni več, potem pa so me spet našli!',
          'Sem velika modro-zelena ptica s svetlo rdečim kljunom.',
        ],
        'Takahe z velikim kljunom izpuli mehke spodnje dele travnih bilk in jih poje.',
      ),
    },
  },
  'great-barrier-reef': {
    name: 'Veliki koralni greben',
    description: 'Največji koralni greben na Zemlji: velikansko podvodno mesto pisanih koral in rib.',
    animals: {
      'orange-clownfish': animal(
        'Riba klovn',
        [
          'Sem majhna riba, ki živi na grebenu.',
          'Varno živim med lovkami morske vetrnice, ki ožiga.',
          'Sem oranžna z belimi progami, kot slavna riba iz risanke!',
        ],
        'Sluzasta prevleka ščiti ribe klovne pred ožigi njihove morske vetrnice.',
      ),
      coral: animal(
        'Korala',
        [
          'Videti sem kot kamen ali rastlina, a sem živa!',
          'Sestavljena sem iz tisočev drobnih živalic, ki živijo skupaj.',
          'Gradim grebene, kjer živi veliko rib.',
        ],
        'Veliki koralni greben je tako velik, da ga astronavti vidijo iz vesolja!',
      ),
      dugong: animal(
        'Dugong',
        [
          'Sem velik in krotek in plavam počasi.',
          'Pasem se na morski travi, kot krava na travniku.',
          'Sem morska krava z repom kot delfin.',
        ],
        'Dugongi lahko živijo sedemdeset let!',
      ),
      'manta-ray': animal(
        'Manta',
        [
          'Sem velika, ploščata riba.',
          'Po vodi drsim, kot da letim.',
          'Sem velikanski skat s plavutmi kot krila in brez bodice.',
        ],
        'Mante imajo največje možgane med vsemi ribami.',
      ),
      'giant-clam': animal(
        'Orjaška školjka',
        [
          'Ko odrastem, se ne premikam več.',
          'Moje ustnice so svetlo modre, zelene ali vijolične.',
          'Sem največja školjka na svetu!',
        ],
        'Orjaške školjke lahko živijo več kot sto let.',
      ),
      'humphead-wrasse': animal(
        'Napoleonova ustnača',
        [
          'Sem velika, prijazna riba.',
          'Sem ena redkih rib, ki jedo bodičaste morske zvezde.',
          'Na čelu imam veliko grbo in debele ustnice.',
        ],
        'Napoleonove ustnače začnejo življenje kot samičke, pozneje pa se lahko spremenijo v samčke!',
      ),
      'blacktip-reef-shark': animal(
        'Črnoplavuti morski pes',
        [
          'Plavam v plitvi, topli vodi.',
          'Sem plah in ponavadi odplavam stran od ljudi.',
          'Sem morski pes s črnimi konicami plavuti.',
        ],
        'V zelo plitvih lagunah včasih vidiš plavut črnoplavutega morskega psa, ki štrli iz vode.',
      ),
      'green-sea-turtle': animal(
        'Zelena želva',
        GREEN_TURTLE_CLUES,
        'Zelene želve lahko med počitkom pod vodo zadržijo dih več ur.',
      ),
    },
  },
};
