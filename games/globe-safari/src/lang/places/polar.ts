import { animal, type TranslatedPlace } from './place.ts';

export const SL_POLAR: Record<string, TranslatedPlace> = {
  arctic: {
    name: 'Arktika',
    description: 'Zamrznjena dežela ledu in snega na vrhu sveta. Pozimi je ves čas tema, poleti pa sonce sploh ne zaide.',
    animals: {
      'polar-bear': animal(
        'Severni medved',
        ['Sem velik in rad imam mraz.', 'Odlično plavam in na morskem ledu lovim tjulnje.', 'Sem velik bel medved!'],
        'Severni medvedi imajo pod belim kožuhom črno kožo, ki vpija toplo sonce.',
      ),
      'arctic-fox': animal(
        'Polarna lisica',
        ['Sem majhna in puhasta.', 'Pozimi je moj kožuh bel, poleti pa rjav.', 'Sem lisica, ki živi tam, kjer je zelo mrzlo.'],
        'Polarne lisice imajo kožuh tudi na podplatih, kot vgrajene škornje za sneg!',
      ),
      reindeer: animal(
        'Severni jelen',
        [
          'Po snegu hodim v velikih čredah.',
          'V moji družini rogovje zraste samcem in samicam.',
          'Nekatere zgodbe pravijo, da vlečem Božičkove sani!',
        ],
        'Noge severnih jelenov med hojo klikajo, zato čreda lažje ostane skupaj.',
      ),
      'snowy-owl': animal(
        'Snežna sova',
        ['Letim čisto tiho.', 'Lovim tudi podnevi in najraje jem leminge.', 'Sem velika bela sova z rumenimi očmi.'],
        'Snežna sova lahko v enem letu poje več kot tisoč lemingov!',
      ),
      'arctic-hare': animal(
        'Polarni zajec',
        [
          'Imam dolge zadnje noge in rad skačem.',
          'Postavim se na zadnje noge, da se razgledam.',
          'Sem bel zajček z ledenega severa.',
        ],
        'Ko polarnega zajca lovi lisica, skače kar šestdeset kilometrov na uro!',
      ),
      muskox: animal(
        'Moškatni vol',
        [
          'Sem velik in kosmat in živim v čredi.',
          'Ko pride nevarnost, se čreda postavi v krog, z rogovi navzven.',
          'Sem volnat vol z zelo dolgo dlako.',
        ],
        'Dlaka moškatnega vola sega skoraj do tal, mehka volna pod njo pa greje veliko bolj kot ovčja.',
      ),
      'arctic-wolf': animal(
        'Polarni volk',
        [
          'Živim in lovim s svojo družino, ki ji pravimo trop.',
          'Zavijam, da se pogovarjam z družino daleč stran.',
          'Sem bel volk z Arktike.',
        ],
        'Pozimi je na Arktiki lahko ves dan tema, polarni volkovi pa lovijo tudi cele mesece v temi.',
      ),
    },
  },
  antarctica: {
    name: 'Antarktika',
    description: 'Najbolj mrzel in vetroven kraj na Zemlji: ogromna ledena dežela čisto na dnu sveta.',
    animals: {
      'emperor-penguin': animal(
        'Cesarski pingvin',
        [
          'Ne znam leteti, sem pa odličen plavalec.',
          'Očki vso temno zimo grejejo jajce na svojih nogah.',
          'Sem največji pingvin na svetu!',
        ],
        'Cesarski pingvini se stisnejo v ogromne gruče in se izmenjujejo v toplem središču.',
      ),
      'adelie-penguin': animal(
        'Adelijin pingvin',
        [
          'Zibaje hodim in rad plavam.',
          'Gnezdo si naredim iz majhnih kamenčkov.',
          'Sem majhen pingvin z belim obročkom okoli vsakega očesa.',
        ],
        'Adelijini pingvini včasih sosedom skrivaj izmaknejo kamenček iz gnezda!',
      ),
      'chinstrap-penguin': animal(
        'Podbradni pingvin',
        [
          'Živim v veliki, hrupni množici.',
          'Do gnezda skačem po skalah.',
          'Sem pingvin s tanko črno črto pod bradico, kot jermenček čelade.',
        ],
        'Podbradni pingvini vsak dan tisočkrat na kratko zadremajo, vsakič le za nekaj sekund!',
      ),
      'gentoo-penguin': animal(
        'Papuanski pingvin',
        [
          'Živim ob mrzlem morju.',
          'Imam svetlo oranžen kljun in bel madež nad očmi.',
          'Sem najhitrejši plavalec med pingvini!',
        ],
        'Papuanski pingvini plavajo kar šestintrideset kilometrov na uro.',
      ),
      'weddell-seal': animal(
        'Weddellov tjulenj',
        [
          'Veliko časa preživim pod ledom.',
          'Z zobmi strgam luknje v led, da lahko diham.',
          'Sem tjulenj, ki živi bolj na jugu kot kateri koli drug sesalec.',
        ],
        'Weddellovi tjulnji lahko pod ledom zadržijo dih več kot eno uro!',
      ),
      'leopard-seal': animal(
        'Morski leopard',
        ['V vodi sem hiter lovec.', 'Imam veliko glavo in ogromna, široka usta.', 'Sem pikast tjulenj, kot velika mačka!'],
        'Morski leopardi pod vodo pojejo, njihove pesmi pa potujejo daleč po ledenem morju.',
      ),
      'snow-petrel': animal(
        'Snežni viharnik',
        [
          'Sem ptica, ki ima rada mraz.',
          'Gnezdim na skalnatih gorah, ki štrlijo iz ledu.',
          'Sem čisto bel, kot leteča snežna kepa.',
        ],
        'Snežne viharnike so videli celo na južnem tečaju, kamor skoraj nobena ptica ne zaide.',
      ),
    },
  },
};
