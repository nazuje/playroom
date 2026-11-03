import { animal, type TranslatedPlace } from './place.ts';

export const SL_ASIA: Record<string, TranslatedPlace> = {
  siberia: {
    name: 'Sibirija in severna Azija',
    description: 'Neskončni zasneženi gozdovi, ki jim pravimo tajga, raztegnjeni čez ves sever Azije.',
    animals: {
      'siberian-tiger': animal(
        'Sibirski tiger',
        [
          'Sem velika mačka in imam rad sneg.',
          'Imam gost kožuh in velike mehke tace, ki me grejejo.',
          'Sem največji tiger, oranžen s črnimi progami.',
        ],
        'Nobena dva tigra nimata enakih prog, progasta pa je celo njihova koža!',
      ),
      'amur-leopard': animal(
        'Amurski leopard',
        [
          'Sem redka mačka iz zasneženih gozdov.',
          'Pozimi mi pikasti kožuh zraste dolg in gost.',
          'Sem leopard, ena najredkejših velikih mačk na Zemlji.',
        ],
        'Amurski leopard lahko v enem skoku skoči skoraj šest metrov naprej!',
      ),
      sable: animal(
        'Sobol',
        [
          'Sem majhen in hiter in živim v gozdu.',
          'Imam zelo mehak, temno rjav kožuh.',
          'Sem mali lovec iz družine podlasic.',
        ],
        'Soboli si v votlih deblih ali pod koreninami naredijo topla gnezda iz trave in dlake.',
      ),
      'baikal-seal': animal(
        'Bajkalski tjulenj',
        [
          'Plavam v sladki vodi, ne v morju.',
          'Živim v najglobljem jezeru na svetu.',
          'Sem majhen okrogel tjulenj iz Bajkalskega jezera.',
        ],
        'Bajkalski tjulnji so med redkimi tjulnji na svetu, ki živijo samo v sladki vodi.',
      ),
      'siberian-musk-deer': animal(
        'Mošusar',
        [
          'Sem majhen, plah jelen.',
          'Sploh nimam rogovja.',
          'Samci imajo dva dolga zoba, podobna oklom, kot jelen vampir!',
        ],
        'Mošusarji imajo močne zadnje noge in skočijo na skalnate police.',
      ),
      'siberian-crane': animal(
        'Sibirski žerjav',
        [
          'Sem visoka ptica z dolgimi nogami.',
          'Vsako pomlad in jesen preletim tisoče kilometrov.',
          'Sem snežno bel žerjav z rdečim obrazom.',
        ],
        'Sibirski žerjavi plešejo v parih, skačejo in mahajo s perutmi.',
      ),
      'mountain-hare': animal(
        'Planinski zajec',
        [
          'Sem hiter in imam dolga ušesa.',
          'Moj kožuh spreminja barvo z letnimi časi.',
          'Sem zajec, ki pozimi pobeli.',
        ],
        'Planinski zajci imajo velike kosmate noge, ki delujejo kot krplje.',
      ),
    },
  },
  himalayas: {
    name: 'Himalaja in Tibet',
    description: 'Najvišje gore na Zemlji, z najvišjo goro sveta, in mrzle, vetrovne planote na strehi sveta.',
    animals: {
      'snow-leopard': animal(
        'Snežni leopard',
        [
          'Sem velika mačka iz visokih gora.',
          'Dolg puhast rep si ovijem okoli sebe kot šal.',
          'Sem pikasta mačka z gostim sivo-belim kožuhom.',
        ],
        'Snežni leopardi ne znajo rjoveti, namesto tega pa puhajo.',
      ),
      'red-panda': animal(
        'Mali panda',
        [
          'Živim na drevesih v meglenih gorskih gozdovih.',
          'Jem veliko bambusa.',
          'Sem rdeča, puhasta žival s progastim repom in belim obrazom.',
        ],
        'Ko je mrzlo, se mali pande ovijejo z dolgim puhastim repom kot z odejo.',
      ),
      'wild-yak': animal(
        'Jak',
        [
          'Živim tam, kjer je zrak redek in mrzel.',
          'Moja dolga, kosmata dlaka sega skoraj do tal.',
          'Sem velik kosmat vol z velikimi rogovi.',
        ],
        'Jaki ne mukajo kot krave, ampak godrnjajo.',
      ),
      'himalayan-tahr': animal(
        'Himalajski tar',
        ['Plezam po strmih, skalnatih pobočjih.', 'Samci imajo veliko kosmato grivo.', 'Sem divja koza iz Himalaje.'],
        'Himalajski tarji imajo gumijasta kopita, ki se oprimejo skal, zato plezajo po pečinah.',
      ),
      'bar-headed-goose': animal(
        'Indijska gos',
        [
          'Sem ptica, ki leti zelo visoko.',
          'Ko se selim, preletim kar Himalajo.',
          'Sem gos z dvema črnima progama na beli glavi.',
        ],
        'Indijske gosi letijo višje od skoraj vseh drugih ptic, čez najvišje gore na Zemlji.',
      ),
      'himalayan-monal': animal(
        'Himalajski monal',
        [
          'Sem ptica, ki v zemlji koplje za koreninami in žuželkami.',
          'Živim v gorskih gozdovih in na travnikih.',
          'Samci imajo mavrično perje, ki se sveti zeleno, modro in vijolično.',
        ],
        'Himalajski monal je narodna ptica Nepala.',
      ),
      'tibetan-sand-fox': animal(
        'Tibetanska lisica',
        [
          'Živim na visokih, mrzlih traviščih.',
          'Rada lovim male kosmate žvižgače.',
          'Sem lisica s smešnim, kvadratastim obrazom!',
        ],
        'Tibetanske lisice včasih sledijo rjavim medvedom, ki kopljejo za žvižgači, in ujamejo tiste, ki pobegnejo.',
      ),
      'himalayan-marmot': animal(
        'Himalajski svizec',
        [
          'Z družino živim v rovu.',
          'Glasno žvižgam, da opozorim na nevarnost.',
          'Sem velika, debelušna podzemna veverica iz visokih gora.',
        ],
        'Himalajski svizci prespijo vso zimo, skoraj pol leta.',
      ),
    },
  },
  'china-bamboo': {
    name: 'Kitajski bambusovi gozdovi',
    description: 'Meglene gore, porasle z bambusom, ter reke, mokrišča in gozdovi vzhodne Azije.',
    animals: {
      'giant-panda': animal(
        'Velika panda',
        [
          'Sem medved, ki živi v meglenih gorah.',
          'Približno pol vsakega dne jem bambus.',
          'Sem črno-bel medved!',
        ],
        'Novorojena velika panda je drobcena, težka približno toliko kot ploščica čokolade.',
      ),
      'golden-snub-nosed-monkey': animal(
        'Zlata opica',
        [
          'Živim v zasneženih gorskih gozdovih.',
          'Imam moder obraz in drobcen privihan nosek.',
          'Sem opica z dolgim zlatim kožuhom.',
        ],
        'Zlate opice se v snegu stisnejo v velike kosmate gruče, da jih ne zebe.',
      ),
      'chinese-giant-salamander': animal(
        'Orjaški močerad',
        ['Živim v hladnih gorskih potokih.', 'Diham skozi nagubano kožo.', 'Sem največja dvoživka na svetu!'],
        'Kitajski orjaški močeradi se lahko oglašajo kot jokajoč dojenček.',
      ),
      'red-crowned-crane': animal(
        'Mandžurski žerjav',
        [
          'Sem visoka ptica, ki brodi po mokriščih.',
          'Pari skupaj plešejo, skačejo in se priklanjajo.',
          'Sem bel žerjav z rdečo kapico na glavi.',
        ],
        'Na Kitajskem in Japonskem mandžurski žerjav pomeni srečo in dolgo življenje.',
      ),
      'golden-pheasant': animal(
        'Zlati fazan',
        [
          'Živim v gostih gorskih gozdovih.',
          'Znam leteti, a raje tečem.',
          'Samci imajo zlat čop ter svetlo rdeče, zlato in modro perje.',
        ],
        'Samec zlatega fazana lahko okoli obraza razpre zlat plašč, da se pokaže.',
      ),
      takin: animal(
        'Takin',
        [
          'Živim v strmih bambusovih gozdovih.',
          'Videti sem malo kot mešanica koze in losa.',
          'Sem velika zlata žival, ki ji včasih pravijo kozji gnu.',
        ],
        'Takini imajo mastno dlako, ki v meglenih gorah deluje kot dežni plašč.',
      ),
      'mandarin-duck': animal(
        'Mandarinka',
        [
          'Plavam po ribnikih in rekah.',
          'Gnezdim visoko v drevesnem duplu.',
          'Samci imajo na hrbtu oranžna jadrca in zelo pisano perje.',
        ],
        'Mladički mandarinke že prvi dan skočijo iz gnezda v drevesnem duplu na tla.',
      ),
    },
  },
  'india-jungles': {
    name: 'Džungle Indije in južne Azije',
    description: 'Vroči gozdovi, travišča in reke, kjer se plazijo tigri in pavi plešejo v dežju.',
    animals: {
      'bengal-tiger': animal(
        'Bengalski tiger',
        ['Sem velika mačka in lovim sam.', 'Rad plavam in se ohladim v reki.', 'Sem oranžen s črnimi progami!'],
        'Tigrovo rjovenje se sliši okoli tri kilometre daleč.',
      ),
      'indian-elephant': animal(
        'Indijski slon',
        [
          'Sem zelo velik in obožujem banane in travo.',
          'Moja ušesa so manjša od ušes mojega afriškega bratranca.',
          'Sem slon iz Azije.',
        ],
        'Sloni se prepoznajo v ogledalu.',
      ),
      'indian-peafowl': animal(
        'Pav',
        [
          'Sem velika ptica z glasnim, kričečim klicem.',
          'Ponoči spim visoko na drevesih.',
          'Samci imajo ogromen rep iz peres, posejan z očesci!',
        ],
        'Pav je narodna ptica Indije.',
      ),
      'indian-rhinoceros': animal(
        'Indijski nosorog',
        [
          'Sem velik in se rad valjam v blatu.',
          'Moja debela koža ima gube, ki so videti kot oklep.',
          'Sem nosorog z enim samim rogom.',
        ],
        'Indijski nosorogi odlično plavajo in se celo potopijo, da jedo podvodne rastline.',
      ),
      'king-cobra': animal(
        'Kraljeva kobra',
        [
          'Nimam nog.',
          'Glavo lahko dvignem visoko od tal.',
          'Sem najdaljša strupena kača, in ko se razjezim, razširim vrat.',
        ],
        'Kraljeve kobre so edine kače, ki za jajca naredijo gnezdo.',
      ),
      'sloth-bear': animal(
        'Medved ustnač',
        [
          'Sem kosmat medved z dolgimi kremplji.',
          'Skozi režo med zobmi srkam termite, kot sesalnik!',
          'Sem črn medved z belo liso na prsih, kot Balu iz Knjige o džungli.',
        ],
        'Mamice medveda ustnača nosijo mladiče na hrbtu.',
      ),
      'rhesus-macaque': animal(
        'Makak rezus',
        ['Živim v veliki, živahni skupini.', 'Odlično plavam.', 'Sem rjava opica z rožnatim obrazom.'],
        'Makaki rezus so tako pametni, da živijo v gozdovih, v gorah in celo v velikih mestih.',
      ),
      gharial: animal(
        'Gavial',
        [
          'Živim v rekah in odlično plavam.',
          'Jem večinoma ribe.',
          'Sem krokodilov bratranec z zelo dolgim, tankim gobcem.',
        ],
        'Odrasli samci gavialov imajo na konici gobca okroglo grbo, podobno loncu.',
      ),
    },
  },
  'southeast-asia': {
    name: 'Deževni gozd jugovzhodne Azije',
    description: 'Soparne džungle na tisočih otokih, kot sta Borneo in Sumatra, kjer opice plezajo z drevesa na drevo.',
    animals: {
      'bornean-orangutan': animal(
        'Orangutan',
        [
          'Skoraj vse življenje preživim na drevesih.',
          'Vsak večer si v krošnji naredim novo posteljo iz listja.',
          'Sem rdečelasa človeška opica z zelo dolgimi rokami.',
        ],
        'Orangutan v malajskem jeziku pomeni gozdni človek.',
      ),
      'sumatran-tiger': animal(
        'Sumatranski tiger',
        ['Lovim v gosti džungli.', 'Med prsti imam kožice, ki mi pomagajo plavati.', 'Sem najmanjši tiger.'],
        'Sumatranski tigri živijo samo na enem otoku: na Sumatri v Indoneziji.',
      ),
      'proboscis-monkey': animal(
        'Nosan',
        [
          'Živim na drevesih ob rekah.',
          'Odlično plavam in imam plavalne kožice.',
          'Samci imajo velik, dolg, mahedrav nos!',
        ],
        'Nosani živijo samo na otoku Borneo.',
      ),
      'malayan-tapir': animal(
        'Malajski tapir',
        [
          'Rad čofotam po vodi.',
          'Moj nos je kot kratek, upogljiv rilec.',
          'Sem črno-bel, kot da bi bil ogrnjen z belo odejo.',
        ],
        'Mladički tapirjev imajo proge in pike kot lubenica, ki zbledijo, ko odrastejo.',
      ),
      'rhinoceros-hornbill': animal(
        'Nosoroški kljunorog',
        [
          'Sem velika ptica iz krošenj.',
          'Jem veliko sadja, najraje fige.',
          'Imam velikanski kljun z zavito oranžno čelado na vrhu.',
        ],
        'Mamice kljunorogov se z jajci zazidajo v drevesno duplo, očka pa jim hrano podaja skozi ozko režo.',
      ),
      'komodo-dragon': animal(
        'Komodski varan',
        [
          'Sem plazilec z dolgim, razcepljenim jezikom.',
          'Z jezikom okušam zrak, da najdem hrano.',
          'Sem največji kuščar na svetu!',
        ],
        'Komodski varani živijo samo na nekaj otokih v Indoneziji.',
      ),
      'sun-bear': animal(
        'Malajski medved',
        [
          'Sem najmanjši medved na svetu.',
          'Imam zelo dolg jezik, s katerim ližem med.',
          'Na prsih imam zlato liso, kot vzhajajoče sonce.',
        ],
        'Malajski medvedi odlično plezajo in včasih spijo v gnezdih na drevesih.',
      ),
      'philippine-tarsier': animal(
        'Avetar',
        [
          'Sem drobcen in ven pridem ponoči.',
          'Glavo lahko obrnem skoraj čisto naokrog.',
          'Vsako moje ogromno oko je veliko kot moji možgani!',
        ],
        'Avetar lahko skoči z drevesa na drevo, mnogokrat dlje, kot je dolg sam.',
      ),
    },
  },
  'arabian-desert': {
    name: 'Arabska puščava in Bližnji vzhod',
    description: 'Vroče, peščene puščave, skalnate gore in zelene oaze po vsej Arabiji in Bližnjem vzhodu.',
    animals: {
      'arabian-oryx': animal(
        'Arabski oriks',
        [
          'Živim v čredah v puščavi.',
          'Moj bel kožuh odbija vroče sonce.',
          'Sem bela antilopa z dvema dolgima, ravnima rogovoma.',
        ],
        'Arabski oriks je v naravi že izginil, a so ga ljudje rešili in vrnili v puščavo!',
      ),
      dromedary: animal(
        'Kamela',
        ['Ljudi nosim čez puščavo.', 'Nosnice lahko zaprem, da ne pride noter pesek.', 'Sem kamela s samo eno grbo.'],
        'Kamele imajo tri veke in dve vrsti dolgih trepalnic, da jim pesek ne pride v oči.',
      ),
      caracal: animal(
        'Karakal',
        [
          'Sem divja mačka in lahko živim v puščavi.',
          'Skočim zelo visoko in ujamem ptice, ki letijo mimo.',
          'Na koničastih ušesih imam dolge črne čopke.',
        ],
        'Karakali skočijo kar tri metre visoko, da ujamejo ptico.',
      ),
      'arabian-wolf': animal(
        'Arabski volk',
        [
          'Živim v majhni družinski skupini.',
          'Imam velika ušesa, ki me hladijo.',
          'Sem eden najmanjših volkov na svetu.',
        ],
        'Arabski volkovi imajo poleti kratko, redko dlako, da jim v puščavski vročini ni prevroče.',
      ),
      'ruppells-fox': animal(
        'Peščena lisica',
        [
          'Ponoči lovim v peščenih, skalnatih puščavah.',
          'Dlaka na tacah mi pomaga hoditi po vročem pesku.',
          'Sem majhna lisica barve peska z belo konico repa.',
        ],
        'Peščene lisice dobijo vso vodo, ki jo potrebujejo, iz hrane.',
      ),
      'desert-hedgehog': animal(
        'Puščavski jež',
        [
          'Ponoči pridem ven jest žuželke.',
          'Moja velika ušesa me hladijo.',
          'Sem majhna bodičasta žival, ki se zvije v kepo.',
        ],
        'Puščavski ježi jedo celo škorpijone, ki jim najprej previdno odgriznejo želo!',
      ),
      'houbara-bustard': animal(
        'Ovratniška droplja',
        [
          'Sem velika ptica, ki več hodi kot leti.',
          'Perje barve peska mi pomaga, da se skrijem v puščavi.',
          'Samci za ples napihnejo belo perje na vratu.',
        ],
        'Droplje dobijo večino vode iz rastlin in žuželk, ki jih jedo.',
      ),
      'egyptian-vulture': animal(
        'Egiptovski jastreb',
        [
          'Sem ptica, ki jadra na toplem zraku.',
          'Sem ena redkih ptic, ki uporabljajo orodje.',
          'Sem bel jastreb z rumenim obrazom.',
        ],
        'Egiptovski jastrebi mečejo kamne v velika nojeva jajca, da jih razbijejo!',
      ),
    },
  },
};
