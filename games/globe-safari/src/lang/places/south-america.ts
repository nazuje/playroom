import { animal, type TranslatedPlace } from './place.ts';

export const SL_SOUTH_AMERICA: Record<string, TranslatedPlace> = {
  amazon: {
    name: 'Amazonski deževni gozd',
    description: 'Največji deževni gozd na Zemlji: vroč, soparen in poln velikanskih dreves ob mogočni reki.',
    animals: {
      jaguar: animal(
        'Jaguar',
        [
          'Sem velika mačka in obožujem vodo.',
          'Moj pikasti kožuh ima obročke s pikicami v sredini.',
          'Sem največja mačka obeh Amerik!',
        ],
        'Jaguarji, za razliko od večine mačk, radi plavajo in v reki lovijo celo ribe in kajmane.',
      ),
      'scarlet-macaw': animal(
        'Škrlatna ara',
        [
          'Imam velik ukrivljen kljun, ki zdrobi orehe.',
          'Živim v krošnjah in sem zelo glasna.',
          'Sem papiga s svetlo rdečim, rumenim in modrim perjem.',
        ],
        'Škrlatne are lahko živijo štirideset do petdeset let, morda tako dolgo kot tvoji stari starši!',
      ),
      'three-toed-sloth': animal(
        'Triprsti lenivec',
        [
          'Skoraj vse življenje preživim na drevesih.',
          'Premikam se zelo, zelo počasi.',
          'Visim narobe obrnjen in imam na vsaki roki tri dolge kremplje.',
        ],
        'Lenivci se premikajo tako počasi, da jim v dlaki rastejo drobne zelene alge, ki jih skrijejo med listjem.',
      ),
      'amazon-river-dolphin': animal(
        'Amazonski delfin',
        ['Plavam v reki, ne v morju.', 'Imam dolg, tanek kljun in upogljiv vrat.', 'Sem rožnat delfin!'],
        'Amazonski delfini lahko obračajo glavo levo in desno, da plavajo med poplavljenimi drevesi. Morski delfini tega ne zmorejo.',
      ),
      'green-anaconda': animal(
        'Zelena anakonda',
        [
          'Nimam nog.',
          'Skrivam se v močvirni vodi, ven pa mi gledajo samo oči in nos.',
          'Sem ena največjih kač na svetu!',
        ],
        'Zelene anakonde so najtežje kače na Zemlji. Velika je lahko težja od odraslega človeka.',
      ),
      'poison-dart-frog': animal(
        'Žaba puščičarka',
        [
          'Sem zelo majhna in živim na tleh deževnega gozda.',
          'Moje žive barve pravijo: ne jej me!',
          'Sem drobcena, pisana žabica.',
        ],
        'Nekateri očki žab puščičark nosijo paglavce na hrbtu do drobnih lužic vode v rastlinah.',
      ),
      'giant-otter': animal(
        'Orjaška vidra',
        [
          'Živim v glasni družini ob reki.',
          'Za plavanje imam plavalne kožice in ploščat rep.',
          'Sem najdaljša vidra na svetu!',
        ],
        'Vsaka orjaška vidra ima na grlu svoj vzorec svetlih lis, kot priponko z imenom.',
      ),
      capybara: animal(
        'Kapibara',
        [
          'Rada sedim v vodi, da se ohladim.',
          'Ptice in druge živali mi rade sedijo na hrbtu.',
          'Sem največji glodavec na svetu!',
        ],
        'Kapibare imajo med prsti majhne plavalne kožice, zato odlično plavajo.',
      ),
    },
  },
  andes: {
    name: 'Andi',
    description: 'Najdaljše gorovje na Zemlji, z zasneženimi vrhovi, visokimi travnatimi planotami in globokimi dolinami.',
    animals: {
      'andean-condor': animal(
        'Andski kondor',
        [
          'Sem zelo velika ptica, ki jadra nad gorami.',
          'Na toplem vetru lahko ure in ure jadram brez zamahov s perutmi.',
          'Sem velikanski črn jastreb s puhastim belim ovratnikom.',
        ],
        'En andski kondor je preletel več kot sto sedemdeset kilometrov, ne da bi vsaj enkrat zamahnil s perutmi!',
      ),
      llama: animal(
        'Lama',
        [
          'Živim z ljudmi v gorah in pomagam nositi tovor.',
          'Imam dolga ušesa v obliki banane.',
          'Sem puhasta žival, ki včasih pljune, ko je jezna!',
        ],
        'Lame se med seboj pogovarjajo z brundanjem, posebno mamice z mladički.',
      ),
      alpaca: animal(
        'Alpaka',
        [
          'Živim visoko v gorah.',
          'Ljudje imajo radi mojo zelo mehko volno.',
          'Videti sem kot majhna, puhasta lama s srčkanim kratkim obrazom.',
        ],
        'Volna alpak je v več kot dvajsetih naravnih barvah, od snežno bele do črne.',
      ),
      vicuna: animal(
        'Vikunja',
        [
          'Sem divja in živim na visokih travnatih planotah.',
          'Sem najmanjša v kamelji družini.',
          'Moja zlata volna je ena najfinejših na svetu.',
        ],
        'Vikunjam sprednji zobje nikoli ne nehajo rasti, tako kot zajcem, zato lahko vse življenje grizljajo trdo travo.',
      ),
      'spectacled-bear': animal(
        'Očalasti medved',
        [
          'Sem medved, ki rad pleza po drevesih.',
          'Na drevesih si naredim gnezda za počitek in hranjenje.',
          'Okoli oči imam svetle obroče, ki so videti kot očala!',
        ],
        'Očalasti medvedi so edini medvedi v Južni Ameriki. Tudi medvedek Paddington prihaja iz Peruja!',
      ),
      chinchilla: animal(
        'Činčila',
        [
          'Sem majhna in živim med visokimi gorskimi skalami.',
          'Kopam se v prahu, da imam čist kožuh.',
          'Imam najmehkejši in najgostejši kožuh med vsemi kopenskimi živalmi!',
        ],
        'Činčilam iz vsake drobne točke na koži zraste okoli petdeset dlak, zato je njihov kožuh tako gost.',
      ),
      'andean-flamingo': animal(
        'Andski flamingo',
        [
          'Stojim na eni nogi v slanih jezerih.',
          'Živim visoko v gorah, kjer je mrzlo.',
          'Sem rožnata ptica z rumenimi nogami.',
        ],
        'Andski flamingi so rožnati zaradi drobnih alg, ki jih jedo.',
      ),
      'sword-billed-hummingbird': animal(
        'Mečekljuni kolibri',
        [
          'Sem drobcena ptica in pijem nektar iz cvetov.',
          'Moje peruti mahajo tako hitro, da brenčijo.',
          'Moj kljun je daljši od mojega telesa!',
        ],
        'Mečekljuni kolibri je edina ptica, ki ima kljun daljši od telesa, če ne štejemo repa.',
      ),
    },
  },
  patagonia: {
    name: 'Patagonija',
    description: 'Divja, vetrovna dežela travnatih planjav, ledenikov in skalnatih obal na dnu Južne Amerike.',
    animals: {
      guanaco: animal(
        'Gvanako',
        [
          'Živim v čredah na vetrovnih planjavah.',
          'Sem divji bratranec lame.',
          'Sem svetlo rjava žival z dolgim vratom iz Patagonije.',
        ],
        'Mladički gvanaka že pol ure po rojstvu stojijo in hodijo.',
      ),
      'magellanic-penguin': animal(
        'Magellanski pingvin',
        [
          'Sem ptica, ki ne zna leteti.',
          'Za gnezdo izkopljem rov v zemljo.',
          'Sem pingvin z dvema črnima progama čez prsi.',
        ],
        'Magellanski pingvini se med seboj kličejo z glasom, ki zveni kot oslovsko riganje.',
      ),
      'darwins-rhea': animal(
        'Darwinov nandu',
        [
          'Sem velika ptica, ki ne zna leteti.',
          'Tečem zelo hitro in bežim v cikcaku.',
          'Videti sem kot majhen noj z rjavim in belim perjem.',
        ],
        'Očki nanduja čisto sami valijo jajca in skrbijo za mladiče.',
      ),
      cougar: animal(
        'Puma',
        ['Sem velika mačka brez pik.', 'Skočim zelo visoko in zelo daleč.', 'Pravijo mi puma ali gorski lev.'],
        'Pume ne znajo rjoveti, znajo pa presti, sikati in celo čivkati kot ptice.',
      ),
      'patagonian-mara': animal(
        'Patagonska mara',
        [
          'Skačem in tečem po suhih traviščih.',
          'Videti sem kot mešanica zajca in majhnega jelena.',
          'Sem velik glodavec iz Patagonije z dolgimi nogami.',
        ],
        'Mare ostanejo v paru vse življenje, očka pa pazi na nevarnost.',
      ),
      'southern-right-whale': animal(
        'Južni gladki kit',
        [
          'Sem ogromna žival, ki plava blizu obale.',
          'Na glavi imam hrapave bele grbice.',
          'Sem velik kit in rad tleskam z repom po vodi.',
        ],
        'Grbice na glavi so pri vsakem kitu razporejene drugače, zato po njih znanstveniki kite ločijo med seboj.',
      ),
      'big-hairy-armadillo': animal(
        'Kosmati pasavec',
        [
          'Kopljem rove v zemljo.',
          'Na hrbtu imam trde ploščice, kot oklep.',
          'Sem pasavec z dlakami, ki štrlijo med ploščicami.',
        ],
        'Pasavci so dobili ime po pasovih na oklepu, ki se upogibajo, ko se premikajo.',
      ),
    },
  },
  galapagos: {
    name: 'Galapaški otoki',
    description: 'Vulkanski otoki v Tihem oceanu, kjer živi veliko živali, ki jih ni nikjer drugje na Zemlji.',
    animals: {
      'galapagos-tortoise': animal(
        'Galapaška želva',
        [
          'Sem velika, počasna in živim zelo dolgo.',
          'Živim lahko več kot sto let.',
          'Sem orjaška želva in ti otoki so dobili ime po meni!',
        ],
        'Galapaške želve zdržijo do enega leta brez hrane in vode.',
      ),
      'marine-iguana': animal(
        'Morski leguan',
        [
          'Sem plazilec, ki se sonči na črnih skalah.',
          'Sol kiham iz nosu!',
          'Sem edini kuščar na svetu, ki plava v morju.',
        ],
        'Morski leguani se potapljajo v mrzel ocean in s skal grizljajo morske alge.',
      ),
      'blue-footed-booby': animal(
        'Modronogi strmoglavec',
        [
          'Sem morska ptica in se potapljam za ribami.',
          'Plešem in pri tem visoko dvigujem noge.',
          'Imam svetlo modre noge!',
        ],
        'Bolj ko so strmoglavcu noge modre, bolj je zdrav, in najbolj modre noge so najbolj priljubljene.',
      ),
      'galapagos-penguin': animal(
        'Galapaški pingvin',
        [
          'Sem majhna ptica, ki ne zna leteti.',
          'Živim na toplem, kar je za mojo družino nenavadno.',
          'Sem edini pingvin, ki živi blizu ekvatorja!',
        ],
        'Galapaški pingvini si s plavutmi senčijo noge pred vročim soncem.',
      ),
      'galapagos-sea-lion': animal(
        'Galapaški morski lev',
        [
          'Sem igriv in rad plavam.',
          'Glasno lajam in dremam na peščenih plažah.',
          'Sem morski lev in včasih spim celo na klopeh v parku!',
        ],
        'Galapaški morski levi so tako radovedni, da pogosto priplavajo čisto do potapljačev in se igrajo z njimi.',
      ),
      'darwins-finches': animal(
        'Darwinovi ščinkavci',
        [
          'Smo majhne ptice.',
          'Vsak od nas ima kljun, ki je ravno pravšnji za hrano, ki jo je.',
          'Slavnemu znanstveniku Darwinu smo pomagali do velikih zamisli!',
        ],
        'Eden od Darwinovih ščinkavcev s kaktusovo bodico kot z orodjem izbeza žuželke iz lesa.',
      ),
      'magnificent-frigatebird': animal(
        'Veličastna fregata',
        [
          'Sem morska ptica z dolgimi, koničastimi perutmi.',
          'V zraku lahko ostanem več dni, ne da bi pristala.',
          'Samci na vratu napihnejo velikanski rdeč balon!',
        ],
        'Fregate ne znajo plavati, zato včasih drugim pticam ukradejo ribo kar v zraku.',
      ),
    },
  },
};
