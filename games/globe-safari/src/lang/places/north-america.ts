import { animal, type TranslatedPlace } from './place.ts';

export const SL_NORTH_AMERICA: Record<string, TranslatedPlace> = {
  'north-american-forests': {
    name: 'Severnoameriški gozdovi',
    description: 'Veliki listnati in zimzeleni gozdovi, polni rek in jezer, od Kanade vse do Floride.',
    animals: {
      'american-black-bear': animal(
        'Črni medved',
        [
          'Sem velik in kosmat in obožujem jagode.',
          'Odlično plezam po drevesih.',
          'Sem najpogostejši medved v Severni Ameriki, pogosto čisto črn.',
        ],
        'Črni medvedi prespijo večino zime v toplem brlogu, kjer se jim skotijo tudi mladiči.',
      ),
      'white-tailed-deer': animal(
        'Belorepi jelen',
        [
          'Sem plaha žival in jem listje in želod.',
          'Moji mladički imajo bele pike, da se lažje skrijejo v gozdu.',
          'Ko me je strah, dvignem bel rep kot zastavico!',
        ],
        'Belorepi jelen lahko preskoči ograjo, ki je višja od odraslega človeka.',
      ),
      moose: animal(
        'Los',
        [
          'Sem zelo visok in imam dolge noge.',
          'Rad zabredem v jezero in jem vodne rastline.',
          'Sem največji jelen na svetu, z ogromnim ploščatim rogovjem.',
        ],
        'Losi odlično plavajo in se celo potopijo, da pod vodo grizljajo rastline.',
      ),
      raccoon: animal(
        'Rakun',
        ['Ven pridem ponoči.', 'Imam spretne ročice in hrano rad otipam.', 'Na obrazu imam črno masko in progast rep.'],
        'Rakuni imajo zelo občutljive tačke, z mokrimi pa tipajo še bolje.',
      ),
      'north-american-beaver': animal(
        'Bober',
        [
          'Sem marljiv graditelj.',
          'Moji oranžni sprednji zobje nikoli ne nehajo rasti.',
          'Iz palic gradim jezove in s ploščatim repom tleskam po vodi!',
        ],
        'Bobrovi zobje so oranžni, ker vsebujejo železo, ki jih naredi še bolj trdne.',
      ),
      'bald-eagle': animal(
        'Beloglavi orel',
        [
          'Sem velika ptica, ki lovi ribe.',
          'Gradim največja gnezda med vsemi pticami v Severni Ameriki.',
          'Imam belo glavo in rumen ukrivljen kljun.',
        ],
        'Beloglavi orel je narodna ptica Združenih držav Amerike.',
      ),
      'striped-skunk': animal(
        'Skunk',
        [
          'Sem majhen in pridem ven ponoči.',
          'Topotam z nogami, da te opozorim, naj ostaneš stran.',
          'Sem črn z belimi progami in znam narediti zelo smrdljiv curek!',
        ],
        'Skunk lahko smrdljiv curek brizgne kar tri metre daleč!',
      ),
      'wild-turkey': animal(
        'Divji puran',
        [
          'Sem velika ptica, ki hodi po gozdnih tleh.',
          'Malo znam leteti, spim pa visoko na drevesih.',
          'Glasno golčim, samci pa razprejo velik rep kot pahljačo!',
        ],
        'Puranu lahko glava spremeni barvo in postane rdeča, bela ali modra, odvisno od tega, kako se počuti!',
      ),
    },
  },
  'great-plains': {
    name: 'Velike planjave',
    description: 'Široka, odprta travišča, kjer piha veter in se zdi, da nebo nikoli ne neha.',
    animals: {
      'american-bison': animal(
        'Ameriški bizon',
        [
          'Sem ogromen in kosmat in potujem v čredah.',
          'Valjam se po prahu, da odženem mrčes.',
          'Sem največja kopenska žival v Severni Ameriki, nekateri mi pravijo bufalo.',
        ],
        'Bizoni so ogromni, a tečejo skoraj tako hitro kot konj.',
      ),
      'prairie-dog': animal(
        'Prerijski pes',
        [
          'Z veliko družino živim pod zemljo.',
          'Postavim se na zadnje noge, da pazim na nevarnost.',
          'Sem debelušna podzemna veverica, ki laja kot majhen kužek!',
        ],
        'Mesta prerijskih psov so lahko ogromna, z rovi za tisoče prerijskih psov.',
      ),
      pronghorn: animal(
        'Vilorog',
        [
          'Jem travo in živim v čredah.',
          'Imam velike oči, ki nevarnost opazijo od daleč.',
          'Sem najhitrejši tekač v Severni Ameriki!',
        ],
        'Vilorogi tečejo kar devetdeset kilometrov na uro in zdržijo veliko dlje kot gepard.',
      ),
      coyote: animal(
        'Kojot',
        [
          'Sem zvita žival in lahko živim skoraj povsod.',
          'Ponoči cvilim in zavijam.',
          'Videti sem kot majhen, suh volk.',
        ],
        'Kojoti se včasih združijo z jazbeci in lovijo skupaj!',
      ),
      'burrowing-owl': animal(
        'Jamska sova',
        ['Sem majhna ptica z dolgimi nogami.', 'Dom si naredim v starih rovih pod zemljo.', 'Sem sova, ki živi v luknji v tleh!'],
        'Ko jih je strah, mladički jamske sove sikajo kot klopotača, da prestrašijo sovražnike.',
      ),
      'american-badger': animal(
        'Ameriški jazbec',
        [
          'Sem nizek in ploščat, z zelo močnimi kremplji.',
          'Kopljem zelo, zelo hitro.',
          'Od nosu čez glavo mi teče bela proga.',
        ],
        'Ameriški jazbec se lahko v nekaj minutah zakoplje tako globoko, da ga ni več videti.',
      ),
      'western-meadowlark': animal(
        'Travniški škorec',
        [
          'Sem ptica, ki poje na stebričkih ograj.',
          'Gnezdo si naredim na tleh, skrito v travi.',
          'Imam svetlo rumene prsi s črno ogrlico.',
        ],
        'Travniški škorec je uradna ptica kar šestih ameriških zveznih držav!',
      ),
    },
  },
  'rocky-mountains': {
    name: 'Skalno gorovje',
    description: 'Visoke, skalnate gore z borovimi gozdovi, cvetočimi travniki in zasneženimi vrhovi.',
    animals: {
      'grizzly-bear': animal(
        'Grizli',
        [
          'Sem velik medved z grbo na plečih.',
          'Kopljem korenine in v rekah lovim losose.',
          'Sem rjav medved s srebrnimi konicami dlake.',
        ],
        'Grizliji zavohajo hrano več kilometrov daleč.',
      ),
      'bighorn-sheep': animal(
        'Debeloroga ovca',
        [
          'Plezam po strmih, skalnatih pečinah.',
          'Samci se zaletavajo z glavami, da pokažejo, kdo je močnejši.',
          'Sem divja ovca z ogromnimi zavitimi rogovi.',
        ],
        'Rogovi velikega ovna lahko tehtajo toliko kot vse druge kosti v njegovem telesu skupaj.',
      ),
      'mountain-goat': animal(
        'Snežna koza',
        [
          'Živim visoko, kamor pride le malo živali.',
          'Moja kopita imajo mehke, oprijemljive blazinice, kot plezalni čevlji.',
          'Sem bela, bradata koza z majhnimi črnimi rogovi.',
        ],
        'Mladički snežne koze znajo plezati in skakati že nekaj ur po rojstvu.',
      ),
      elk: animal(
        'Vapiti',
        [
          'Sem velik jelen in živim v čredi.',
          'Jeseni samci kličejo z glasnim, piskajočim glasom.',
          'Sem velik jelen z ogromnim rogovjem in svetlo zadnjico.',
        ],
        'Samcu vapitija lahko poleti rogovje zraste kar dva centimetra in pol na dan!',
      ),
      'american-pika': animal(
        'Ameriški žvižgač',
        [
          'Sem drobcen in živim med skalami.',
          'Poleti nabiram travo in cvetlice ter si za zimo naredim kupčke sena.',
          'Videti sem kot majhna okrogla miška, sem pa sorodnik zajcev!',
        ],
        'Žvižgači glasno zapiskajo, da sosede opozorijo na nevarnost.',
      ),
      'golden-eagle': animal(
        'Planinski orel',
        [
          'Sem velika ptica, ki jadra nad gorami.',
          'Po zraku se zelo hitro spustim, da ujamem hrano.',
          'Sem rjav orel z zlatim perjem na vratu.',
        ],
        'Planinski orli se lahko spustijo s hitrostjo več kot dvesto štirideset kilometrov na uro!',
      ),
      'canada-lynx': animal(
        'Kanadski ris',
        [
          'Sem divja mačka iz zasneženih gozdov.',
          'Moje velike kosmate tace so kot krplje.',
          'Imam črne čopke na ušesih in kratek, čokat rep.',
        ],
        'Kanadski risi jedo večinoma zajce. Kadar je zajcev veliko, je veliko tudi risov.',
      ),
      wolf: animal(
        'Sivi volk',
        [
          'Živim in lovim s svojo družino.',
          'Zavijam, da pokličem svoj trop.',
          'Sem velik siv divji pes, največji v pasji družini.',
        ],
        'Ko so se volkovi vrnili v velik ameriški narodni park, je postal ves gozd z rekami vred bolj zdrav.',
      ),
    },
  },
  'desert-southwest': {
    name: 'Ameriški jugozahod in Mehika',
    description: 'Vroče, sončne puščave, polne kaktusov, pa še gore, gozdovi in jezera Mehike.',
    animals: {
      'greater-roadrunner': animal(
        'Cestni tekač',
        [
          'Sem ptica, ki raje teče kot leti.',
          'Tako hiter sem, da ujamem kuščarje in celo kače.',
          'Sem urna puščavska ptica, znana iz risank. Bip bip!',
        ],
        'Cestni tekači tečejo kar trideset kilometrov na uro.',
      ),
      'gila-monster': animal(
        'Gila',
        [
          'Sem počasen, čokat plazilec.',
          'V debelem repu si shranim maščobo za lačne čase.',
          'Sem kuščar z bradavičasto oranžno-črno kožo.',
        ],
        'Gila lahko naenkrat poje toliko, da potrebuje le nekaj obrokov na leto.',
      ),
      'western-diamondback-rattlesnake': animal(
        'Klopotača',
        [
          'Nimam nog in rada imam tople skale.',
          'Po hrbtu imam vzorec rombov.',
          'S koncem repa tresem in naredim opozorilno klopotanje!',
        ],
        'Klopotača dobi nov delček klopotca vsakič, ko se levi.',
      ),
      'collared-peccary': animal(
        'Pekari',
        [
          'Potujem v skupini in rad jem opuncije.',
          'Malo smrdim, nalašč, da se v družini lažje zavohamo.',
          'Videti sem kot majhen kosmat prašič z belim ovratnikom.',
        ],
        'Pekariji lahko jedo opuncije, kar z bodicami vred!',
      ),
      'black-tailed-jackrabbit': animal(
        'Črnorepi zajec',
        [
          'Sem hiter in daleč skočim.',
          'Moja ogromna ušesa me hladijo na vročem soncu.',
          'Sem velik puščavski zajec s črnim repom.',
        ],
        'Mladički črnorepega zajca se skotijo že kosmati in z odprtimi očmi.',
      ),
      'monarch-butterfly': animal(
        'Monarh',
        [
          'Življenje začnem kot progasta gosenica.',
          'Milijoni nas preletijo na tisoče kilometrov, da prezimimo v mehiških gozdovih.',
          'Sem oranžno-črn metulj.',
        ],
        'Gosenice monarha jedo samo svilnico, zato so pticam zoprnega okusa.',
      ),
      axolotl: animal(
        'Aksolotl',
        [
          'Živim v vodah okoli glavnega mesta Mehike.',
          'Iz glave mi štrlijo pernate škrge, kot krona.',
          'Sem nasmejan rožnat ali rjav močerad.',
        ],
        'Aksolotli si lahko obnovijo izgubljene noge in celo dele srca in možganov!',
      ),
      'desert-tortoise': animal(
        'Puščavska želva',
        ['Sem počasna in imam trd oklep.', 'Vroče dneve preživim v podzemnem rovu.', 'Sem želva iz vroče, suhe puščave.'],
        'Puščavske želve si vodo shranijo v telesu in zdržijo leto ali več brez pitja.',
      ),
    },
  },
  caribbean: {
    name: 'Karibi in Srednja Amerika',
    description: 'Tople džungle, polne pisanih ptic in žab, ob svetlo modrem morju in peščenih otokih.',
    animals: {
      'resplendent-quetzal': animal(
        'Kvecal',
        [
          'Sem plaha ptica iz meglenih gorskih gozdov.',
          'Moja repna peresa so lahko daljša od mojega telesa.',
          'Sem bleščeče zelena ptica z rdečim trebuščkom.',
        ],
        'Kvecal je v Gvatemali tako poseben, da se po njem imenuje tudi njihov denar!',
      ),
      'keel-billed-toucan': animal(
        'Tukan',
        [
          'Živim v krošnjah in obožujem sadje.',
          'Moj kljun je ogromen, a zelo lahek, znotraj kot goba.',
          'Imam velikanski kljun v mavričnih barvah!',
        ],
        'Tukani spijo s kljunom pod perutjo in prepognjenim repom, kot pernata žoga.',
      ),
      'red-eyed-tree-frog': animal(
        'Rdečeoka drevesna žaba',
        [
          'Sem majhna in zelena in podnevi spim.',
          'Imam oranžne noge z lepljivimi prsti.',
          'Imam velike, svetlo rdeče oči!',
        ],
        'Ko rdečeoka drevesna žaba spi, skrije svoje barve, nato pa nenadoma pokaže rdeče oči in prestraši lačne živali.',
      ),
      'mantled-howler': animal(
        'Vreščač',
        [
          'Z družino živim visoko v krošnjah.',
          'Z repom se oprimem vej, kot z dodatno roko.',
          'Sem opica z zelo glasnim klicem!',
        ],
        'Vreščači so med najglasnejšimi živalmi na kopnem. Njihov klic se sliši pet kilometrov daleč.',
      ),
      'green-sea-turtle': animal(
        'Zelena želva',
        [
          'Plavam v toplih morjih.',
          'Mamice ponoči prilezejo na peščene plaže, da izležejo jajca.',
          'Sem velika morska želva in rada jem morsko travo.',
        ],
        'Zelene želve so dobile ime po zeleni maščobi pod oklepom, ne po oklepu.',
      ),
      'american-flamingo': animal(
        'Ameriški flamingo',
        [
          'Brodim po plitvi, slani vodi.',
          'Jem z glavo, obrnjeno narobe.',
          'Sem svetlo rožnata ptica, ki pogosto stoji na eni nogi.',
        ],
        'Ameriški flamingi so najbolj rožnati od vseh flamingov.',
      ),
      'west-indian-manatee': animal(
        'Lamantin',
        ['Sem velik in krotek in plavam počasi.', 'Ure in ure mlaskam morsko travo.', 'Pravijo mi morska krava!'],
        'Lamantini so daljni sorodniki slonov!',
      ),
    },
  },
};
