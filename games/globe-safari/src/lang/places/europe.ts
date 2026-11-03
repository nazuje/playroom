import { animal, type TranslatedPlace } from './place.ts';

export const SL_EUROPE: Record<string, TranslatedPlace> = {
  'european-woodlands': {
    name: 'Evropski gozdovi',
    description: 'Listnati gozdovi, travniki in žive meje, kjer se živali skrivajo med hrasti in bukvami.',
    animals: {
      'red-fox': animal(
        'Lisica',
        [
          'Sem zvita in pridem ven v mraku.',
          'Visoko skočim in planem na miške, ki se skrivajo v snegu.',
          'Sem oranžna žival s košatim repom z belo konico.',
        ],
        'Lisica sliši cviliti miško tudi sto metrov daleč!',
      ),
      'european-hedgehog': animal(
        'Jež',
        ['Sem majhen in ponoči njuškam naokrog.', 'Ko me je strah, se zvijem v kepo.', 'Pokrivajo me tisoči bodic!'],
        'Ježi vso zimo prespijo v toplem gnezdu iz listja.',
      ),
      'red-squirrel': animal(
        'Veverica',
        [
          'Živim na drevesih in odlično skačem.',
          'Zakopljem orehe in semena, da jih pojem pozneje.',
          'Sem rdečkasta veverica s puhastimi čopki na ušesih.',
        ],
        'Veverice ne najdejo vedno vseh zakopanih orehov, zato pomagajo saditi nova drevesa!',
      ),
      'red-deer': animal(
        'Jelen',
        [
          'Sem velik in jem travo in listje.',
          'Jeseni samci glasno rukajo, da se pokažejo.',
          'Sem velik rdečkasto rjav jelen z razvejanim rogovjem.',
        ],
        'Jeleni vsako pomlad odvržejo rogovje, do jeseni pa jim zraste čisto novo.',
      ),
      'wild-boar': animal(
        'Divji prašič',
        ['Z rilcem rad rijem po zemlji.', 'Moji mladički so progasti, kot lubenica.', 'Sem divji pujs z okli.'],
        'Divji prašiči imajo izjemen voh in izvohajo hrano, ki je zakopana pod zemljo.',
      ),
      'european-badger': animal(
        'Jazbec',
        [
          'Živim pod zemljo, v velikem domu iz rovov, ki mu pravimo jazbina.',
          'Ponoči pridem ven jest deževnike.',
          'Imam črno-belo progast obraz.',
        ],
        'Nekatere jazbine jazbečje družine uporabljajo že več kot sto let!',
      ),
      'white-stork': animal(
        'Bela štorklja',
        [
          'Sem velika ptica z dolgimi nogami.',
          'Ogromna gnezda gradim na strehah in dimnikih.',
          'Sem bela ptica z dolgim rdečim kljunom, v zgodbah pa prinašam dojenčke!',
        ],
        'Bele štorklje za zimo odletijo vse do Afrike, spomladi pa se vrnejo.',
      ),
      'eurasian-eagle-owl': animal(
        'Velika uharica',
        [
          'Lovim ponoči.',
          'Imam velike, svetlo oranžne oči.',
          'Sem ena največjih sov na svetu, s pernatimi čopki, ki so videti kot ušesa.',
        ],
        'Sove lahko glavo obrnejo skoraj za tri četrtine kroga!',
      ),
    },
  },
  'nordic-taiga': {
    name: 'Severni gozdovi in fjordi',
    description: 'Mrzli gozdovi borov in smrek, globoki modri fjordi in dolge, snežne zime.',
    animals: {
      moose: animal(
        'Los',
        [
          'Sem ogromen in imam zelo dolge noge.',
          'Rad brodim po močvirjih in jem vodne rastline.',
          'Sem največji jelen na svetu, s širokim ploščatim rogovjem.',
        ],
        'Losi lahko zaprejo nosnice, ko glavo potopijo pod vodo.',
      ),
      reindeer: animal(
        'Severni jelen',
        [
          'Živim v velikih čredah na mrzlem severu.',
          'S širokimi kopiti kopljem po snegu, da najdem hrano.',
          'Moji sorodniki vlečejo Božičkove sani!',
        ],
        'Na skrajnem severu ljudstvo Sami že stoletja pase severne jelene.',
      ),
      'eurasian-lynx': animal(
        'Ris',
        [
          'Sem plaha divja mačka iz gozda.',
          'Moje velike kosmate tace mi pomagajo hoditi po snegu.',
          'Imam črne čopke na ušesih in kratek repek.',
        ],
        'Evrazijski ris je največji ris na svetu. Živi tudi v slovenskih gozdovih!',
      ),
      wolverine: animal(
        'Rosomah',
        [
          'Nisem zelo velik, sem pa zelo močan in trdoživ.',
          'Po snežnih gorah lahko prehodim zelo dolgo pot.',
          'Videti sem kot majhen medved s košatim repom, sem pa sorodnik podlasice.',
        ],
        'Rosomahi izvohajo hrano, zakopano globoko pod snegom.',
      ),
      'brown-bear': animal(
        'Rjavi medved',
        ['Sem velik in močan.', 'Vso zimo spim v brlogu.', 'Sem velik rjav medved!'],
        'Pred zimo lahko rjavi medved na dan poje kar štirideset kilogramov hrane.',
      ),
      'western-capercaillie': animal(
        'Divji petelin',
        [
          'Sem velika ptica iz borovega gozda.',
          'Samci se postavljajo s smešno pesmijo, ki klika in poka.',
          'Sem največji med gozdnimi kurami, samci pa razprejo rep kot pahljačo.',
        ],
        'Divji petelini pogoltnejo majhne kamenčke, ki jim v trebuščku zmeljejo trde borove iglice.',
      ),
      'atlantic-puffin': animal(
        'Mormon',
        [
          'Sem morska ptica in se potapljam za ribami.',
          'Gnezdim v luknjah na vrhu pečin.',
          'Imam pisan kljun in pravijo mi morski klovn!',
        ],
        'Mormon lahko v kljunu hkrati nosi več kot deset majhnih ribic!',
      ),
      'great-grey-owl': animal(
        'Bradata sova',
        [
          'Lovim v zasneženih gozdovih.',
          'Slišim miške pod snegom in se poženem vanj, da jih ujamem.',
          'Sem velika siva sova z ogromnim okroglim obrazom.',
        ],
        'Bradata sova je videti ogromna, a je večinoma iz puhastega perja in je lažja, kot se zdi.',
      ),
    },
  },
};
