import { animal, type TranslatedPlace } from './place.ts';

export const SL_OCEANS: Record<string, TranslatedPlace> = {
  'pacific-ocean': {
    name: 'Tihi ocean',
    description: 'Največji in najgloblji ocean na Zemlji, večji od vsega kopnega skupaj!',
    animals: {
      'humpback-whale': animal(
        'Grbavi kit',
        [
          'Sem velikan, ki plava čez ocean.',
          'Skočim čisto iz vode in pljusknem nazaj.',
          'Sem kit, znan po dolgih pesmih.',
        ],
        'Pesmi grbavih kitov lahko trajajo več ur, kiti na istem koncu morja pa pojejo isto pesem.',
      ),
      'sea-otter': animal(
        'Morska vidra',
        [
          'Na hrbtu plavam po morju.',
          'S kamnom na trebuščku razbijam školjke.',
          'Sem kosmata morska žival, ki se med spanjem s prijatelji drži za roke.',
        ],
        'Morske vidre imajo najgostejši kožuh med vsemi živalmi: na koščku, velikem kot znamka, jim zraste kar milijon dlak!',
      ),
      'giant-pacific-octopus': animal(
        'Orjaška hobotnica',
        [
          'Nimam kosti, zato se splazim skozi drobne luknje.',
          'Barvo lahko spremenim v trenutku.',
          'Sem največja hobotnica, z osmimi dolgimi lovkami.',
        ],
        'Hobotnice imajo tri srca in modro kri!',
      ),
      'great-white-shark': animal(
        'Veliki beli morski pes',
        [
          'Sem velika riba z veliko ostrimi zobmi.',
          'Drobno kapljico krvi zavoham od daleč.',
          'Sem največja plenilska riba, zgoraj siva, spodaj bela.',
        ],
        'Velikim belim morskim psom vse življenje rastejo novi zobje, porabijo jih kar na tisoče!',
      ),
      'leatherback-sea-turtle': animal(
        'Usnjača',
        ['Preplavam cele oceane.', 'Rada jem meduze.', 'Sem največja želva, z mehkim oklepom, kot iz usnja.'],
        'Usnjače se lahko potopijo več kot tisoč metrov globoko!',
      ),
      'flying-fish': animal(
        'Leteča riba',
        [
          'Sem riba, ki plava blizu gladine.',
          'Imam zelo velike plavuti, kot krila.',
          'Znam skočiti iz vode in jadrati po zraku!',
        ],
        'Leteče ribe lahko v enem kosu prejadrajo več kot štirideset metrov po zraku.',
      ),
      'california-sea-lion': animal(
        'Morski lev',
        [
          'Sem igriv in rad jaham valove.',
          'Po kopnem znam hoditi s plavutmi.',
          'Sem lajajoč morski lev s pacifiške obale.',
        ],
        'Kalifornijski morski levi plavajo s hitrostjo okoli štirideset kilometrov na uro.',
      ),
    },
  },
  'atlantic-ocean': {
    name: 'Atlantski ocean',
    description: 'Drugi največji ocean, ki sega od ledenega severa vse do Antarktike.',
    animals: {
      'bottlenose-dolphin': animal(
        'Velika pliskavka',
        [
          'Sem igriv plavalec in rad skačem.',
          'Hrano najdem tako, da klikam in poslušam odmeve.',
          'Sem siv delfin s prijaznim nasmehom.',
        ],
        'Vsaka velika pliskavka ima svoj posebni žvižg, kot ime!',
      ),
      'loggerhead-sea-turtle': animal(
        'Glavata kareta',
        [
          'Preplavam ocean.',
          'Imam močne čeljusti, s katerimi hrustam rake in školjke.',
          'Sem morska želva z veliko glavo in rdečkasto rjavim oklepom.',
        ],
        'Mamice glavatih karet se pogosto vrnejo na isto plažo, kjer so se same izvalile, in tam izležejo jajca.',
      ),
      'north-atlantic-right-whale': animal(
        'Gladki kit',
        [
          'Sem velikan, ki počasi plava blizu obale.',
          'Na glavi imam hrapave bele lise.',
          'Sem velik temen kit brez plavuti na hrbtu.',
        ],
        'Severnoatlantski gladki kiti so zelo redki: ostalo jih je le nekaj sto.',
      ),
      'portuguese-man-o-war': animal(
        'Portugalska ladjica',
        [
          'Plavam na gladini morja.',
          'Imam modro vijoličen balon, ki deluje kot jadro.',
          'Videti sem kot meduza z dolgimi lovkami, ki ožigajo!',
        ],
        'Portugalska ladjica ni ena sama žival, ampak ekipa drobnih živalic, ki delajo skupaj.',
      ),
      'ocean-sunfish': animal(
        'Morski mesec',
        [
          'Sem zelo velika, zelo ploščata riba.',
          'Rad se sončim na boku na gladini morja.',
          'Videti sem kot velikanska plavajoča ribja glava!',
        ],
        'Morski meseci so najtežje koščenice na svetu. Velik tehta toliko kot avto.',
      ),
      'american-lobster': animal(
        'Jastog',
        [
          'Živim na skalnatem morskem dnu.',
          'Imam dve veliki škarji: eno za drobljenje in eno za rezanje.',
          'Sem morska žival s trdim oklepom, dolgimi tipalkami in velikanskimi škarjami.',
        ],
        'Nekateri jastogi lahko dočakajo sto let!',
      ),
      'atlantic-bluefin-tuna': animal(
        'Modroplavuti tun',
        [
          'Sem velika, zelo hitra riba.',
          'Imam toplo kri, kar je za ribo nenavadno.',
          'Sem velikanski tun s temno modrim hrbtom.',
        ],
        'Modroplavuti tuni lahko v približno dveh mesecih preplavajo ves Atlantski ocean.',
      ),
    },
  },
  'indian-ocean': {
    name: 'Indijski ocean',
    description: 'Topel ocean, poln koralnih otokov, med Afriko, Azijo in Avstralijo.',
    animals: {
      'spinner-dolphin': animal(
        'Dolgokljuni delfin',
        [
          'Plavam v velikih skupinah.',
          'Sem majhen in vitek, z dolgim kljunom.',
          'Skočim iz vode in se v zraku zavrtim!',
        ],
        'Dolgokljuni delfini se lahko v enem samem skoku zavrtijo kar sedemkrat!',
      ),
      'hawksbill-sea-turtle': animal(
        'Prava kareta',
        [
          'Plavam blizu koralnih grebenov.',
          'Rada jem spužve.',
          'Sem morska želva s koničastim kljunom, kot ga imajo ptice.',
        ],
        'Prave karete jedo spužve, ki bi sicer prerasle korale, in tako skrbijo za zdrave grebene.',
      ),
      'whale-shark': animal(
        'Kitovski morski pes',
        [
          'Sem ogromen, a zelo krotek.',
          'Drobno hrano jem tako, da plavam s široko odprtimi usti.',
          'Sem največja riba na svetu, posuta z belimi pikami!',
        ],
        'Vsak kitovski morski pes ima svoj vzorec pik, kot prstni odtis.',
      ),
      coelacanth: animal(
        'Latimerija',
        [
          'Živim globoko v morju, v temnih jamah.',
          'Moje plavuti so malo podobne nožicam.',
          'Pravijo mi živi fosil. Znanstveniki so mislili, da me ni več že od časa dinozavrov!',
        ],
        'Ko so latimerijo našli živo, so bili znanstveniki zelo presenečeni. Mislili so, da so izumrle pred šestinšestdesetimi milijoni let.',
      ),
      'mantis-shrimp': animal(
        'Rak bogomolka',
        [
          'Živim v rovu na morskem dnu.',
          'Moje čudovite oči vidijo barve, ki jih ti ne vidiš.',
          'Sem mavrično pisan rak z najhitrejšim udarcem v morju!',
        ],
        'Rak bogomolka udari tako močno, da razbije polžjo hišico in celo steklo akvarija!',
      ),
      sailfish: animal(
        'Jadrovnica',
        [
          'Sem velika riba z dolgim, koničastim nosom.',
          'Na hrbtu lahko dvignem velikansko plavut kot jadro.',
          'Sem ena najhitrejših rib v oceanu!',
        ],
        'Jadrovnice lahko v hipu spremenijo barvo in zmedejo ribice, ki jih lovijo.',
      ),
      'red-lionfish': animal(
        'Levja riba',
        [
          'Živim na koralnih grebenih.',
          'Imam dolge, nagubane plavuti, ki so videti kot perje.',
          'Sem progasta rdeče-bela riba z bodičastimi trni.',
        ],
        'Levje ribe razprejo velike plavuti in ribice potisnejo v kot, preden jih pogoltnejo.',
      ),
    },
  },
  'southern-ocean': {
    name: 'Južni ocean',
    description: 'Divji, vetrovni ocean, ki se vrtinči vse naokoli Antarktike.',
    animals: {
      'antarctic-krill': animal(
        'Antarktični kril',
        [
          'Sem drobcen, a nas je milijarde in milijarde.',
          'Kiti, tjulnji in pingvini me zelo radi jedo.',
          'Sem majhna prozorna živalca, podobna kozici.',
        ],
        'Antarktični kril ima na telesu lučke, ki svetijo v temnem morju.',
      ),
      'blue-whale': animal(
        'Sinji kit',
        [
          'Jem drobni kril, kar polna usta naenkrat.',
          'Daljši sem od košarkarskega igrišča.',
          'Sem največja žival, ki je kdaj živela!',
        ],
        'Klic sinjega kita je glasnejši od reaktivnega motorja in pod vodo potuje stotine kilometrov daleč.',
      ),
      orca: animal(
        'Orka',
        [
          'Živim v tesni družinski skupini.',
          'Sem črno-bela in zelo pametna.',
          'Pravijo mi kit ubijalec, a sem v resnici velik delfin!',
        ],
        'Vsaka družina ork ima svoje posebne klice, malo kot družinski jezik.',
      ),
      'wandering-albatross': animal(
        'Potujoči albatros',
        [
          'Večino življenja preživim nad morjem.',
          'Ure in ure lahko jadram, ne da bi zamahnil s perutmi.',
          'Moje peruti so širše od peruti katere koli druge ptice!',
        ],
        'Peruti potujočega albatrosa merijo od konice do konice več kot tri metre.',
      ),
      'southern-elephant-seal': animal(
        'Južni morski slon',
        [
          'Sem zelo, zelo velik in se rad potapljam globoko.',
          'Za hrano se potopim več kot kilometer globoko.',
          'Samci v moji družini imajo velik mahedrav nos, kot rilec!',
        ],
        'Velik samec južnega morskega slona lahko tehta toliko kot dva avtomobila!',
      ),
      'crabeater-seal': animal(
        'Rakojedi tjulenj',
        [
          'Počivam na plavajočem morskem ledu.',
          'Moji grbasti zobje delujejo kot sito, s katerim precedim hrano iz vode.',
          'Po imenu jem rake, v resnici pa jem kril!',
        ],
        'Rakojedi tjulnji so morda najpogostejši tjulnji na vsem svetu.',
      ),
      'king-penguin': animal(
        'Kraljevi pingvin',
        [
          'Ne znam leteti, znam pa odlično plavati.',
          'Moji mladički so pokriti s puhastim rjavim puhom, kot medvedki.',
          'Sem drugi največji pingvin, s svetlo oranžnimi lisami.',
        ],
        'Mladički kraljevega pingvina so tako puhasti, da so raziskovalci nekoč mislili, da so druga vrsta pingvina!',
      ),
      'colossal-squid': animal(
        'Kolosalni ligenj',
        [
          'Živim globoko, globoko v temi.',
          'Na lovkah imam ostre kaveljčke.',
          'Imam največje oči med vsemi živalmi!',
        ],
        'Oko kolosalnega lignja je lahko veliko kot nogometna žoga.',
      ),
    },
  },
  'arctic-ocean': {
    name: 'Severni ledeni ocean',
    description: 'Mrzel ocean na vrhu sveta, ki ga večji del leta prekriva plavajoči morski led.',
    animals: {
      narwhal: animal(
        'Narval',
        ['Sem kit, ki živi v ledeni vodi.', 'Imam en zelo, zelo dolg zob.', 'Pravijo mi morski samorog!'],
        'Narvalov dolgi okel je v resnici zob in zraste lahko do tri metre!',
      ),
      'beluga-whale': animal(
        'Beluga',
        [
          'Sem kit in rada klepetam.',
          'Toliko žvižgam in klikam, da so mi mornarji rekli morski kanarček.',
          'Sem bel kit z okroglim, izbočenim čelom.',
        ],
        'Beluge lahko spreminjajo obliko mehkega čela in tako delajo različne zvoke.',
      ),
      walrus: animal(
        'Mrož',
        [
          'Sem velik in težak in rad ležim na ledu.',
          'Z brki iščem školjke na morskem dnu.',
          'Imam dva dolga bela okla.',
        ],
        'Mroži se z okli kot z ledenimi cepini potegnejo iz vode.',
      ),
      'ringed-seal': animal(
        'Obročkasti tjulenj',
        [
          'Plavam pod morskim ledom.',
          'Z močnimi kremplji praskam luknje za dihanje v led.',
          'Sem majhen tjulenj z obročkastimi lisami na kožuhu.',
        ],
        'Mamice obročkastih tjulnjev na ledu izkopljejo snežne jame, kjer so mladički na varnem in na toplem.',
      ),
      'bowhead-whale': animal(
        'Grenlandski kit',
        [
          'Sem ena največjih živali na Arktiki.',
          'Z ogromno glavo prebijem led, da naredim luknjo za dihanje.',
          'Sem velikanski kit z usti v obliki loka.',
        ],
        'Grenlandski kiti lahko živijo več kot dvesto let, dlje kot kateri koli drug sesalec!',
      ),
      'arctic-tern': animal(
        'Polarna čigra',
        [
          'Sem ptica z rdečim kljunom.',
          'Vsako leto letim z vrha sveta na dno in spet nazaj.',
          'Opravim najdaljše potovanje med vsemi živalmi na Zemlji!',
        ],
        'Polarne čigre vidijo več dnevne svetlobe kot katera koli druga žival, ker lovijo poletje na obeh koncih Zemlje.',
      ),
      'greenland-shark': animal(
        'Grenlandski morski pes',
        [
          'Počasi plavam v globoki, mrzli vodi.',
          'Sem ena najdlje živečih živali na Zemlji.',
          'Sem velik, zaspan morski pes z Arktike.',
        ],
        'Znanstveniki mislijo, da lahko grenlandski morski psi živijo okoli štiristo let!',
      ),
    },
  },
};
