// Background photos for the sign-in screen. Only add photos with a free licence
// (public domain, CC0, or Creative Commons with the required credit filled in below).
// Files live in /public/login-bg. An empty list simply shows the gradient background.
export type LoginPhoto = {
  src: string;
  alt: string;
  /** Shown as a small credit line on the sign-in screen. */
  credit: string;
  creditUrl: string;
};

// All from Wikimedia Commons; each credit links to the photo's page with its licence details.
export const LOGIN_PHOTOS: LoginPhoto[] = [
  {
    src: "/login-bg/kotel-dusk.jpg",
    alt: "The Western Wall in Jerusalem at night",
    credit: "Photo: Rhododendrites, CC BY-SA 4.0 (resized), via Wikimedia Commons",
    creditUrl: "https://commons.wikimedia.org/wiki/File:Western_Wall_at_night_(20063).jpg",
  },
  {
    src: "/login-bg/jaffa-aerial.jpg",
    alt: "The port and old city of Jaffa, from the air",
    credit: "Photo: Godot13, CC BY-SA 4.0 (resized), via Wikimedia Commons",
    creditUrl: "https://commons.wikimedia.org/wiki/File:ISR-2013-Aerial-Jaffa-Port_of_Jaffa.jpg",
  },
  {
    src: "/login-bg/masada-cliffs.jpg",
    alt: "The cliffs of Masada, from the air",
    credit: "Photo: Godot13, CC BY-SA 4.0 (resized), via Wikimedia Commons",
    creditUrl: "https://commons.wikimedia.org/wiki/File:Israel-2013-Aerial_21-Masada.jpg",
  },
  {
    src: "/login-bg/dead-sea-lagoon.jpg",
    alt: "A turquoise lagoon and salt island at the Dead Sea",
    credit: "Photo: Tiia Monto, CC BY-SA 3.0 (resized), via Wikimedia Commons",
    creditUrl: "https://commons.wikimedia.org/wiki/File:Dead_Sea_shore.jpg",
  },
  {
    src: "/login-bg/ein-gedi-canyon.jpg",
    alt: "A canyon at Ein Gedi with the Dead Sea beyond",
    credit: "Photo: Ludvig14, CC BY-SA 4.0 (resized), via Wikimedia Commons",
    creditUrl: "https://commons.wikimedia.org/wiki/File:Ein-Gedi_D08v2.jpg",
  },
  {
    src: "/login-bg/jaffa-port-dusk.jpg",
    alt: "The old port of Jaffa at dusk",
    credit: "Photo: Noam.armonn, CC BY-SA 3.0 (resized), via Wikimedia Commons",
    creditUrl: "https://commons.wikimedia.org/wiki/File:OLD_JAFFA_PORT.jpg",
  },
  {
    src: "/login-bg/dead-sea-coast.jpg",
    alt: "The shore of the Dead Sea beneath desert mountains",
    credit: "Photo: Mustang Joe, CC0, via Wikimedia Commons",
    creditUrl: "https://commons.wikimedia.org/wiki/File:Shore_of_the_Dead_Sea_(53258647442).jpg",
  },
  {
    src: "/login-bg/masada-snake-path.jpg",
    alt: "Masada's Northern Palace and the Snake Path, from the air",
    credit: "Photo: Godot13, CC BY-SA 4.0 (resized), via Wikimedia Commons",
    creditUrl: "https://commons.wikimedia.org/wiki/File:ISR-2013-Aerial-Masada-Northern_Palace_01.jpg",
  },
  {
    src: "/login-bg/ein-gedi-shore.jpg",
    alt: "The Dead Sea shoreline near Ein Gedi",
    credit: "Photo: Databases, CC BY-SA 4.0 (resized), via Wikimedia Commons",
    creditUrl: "https://commons.wikimedia.org/wiki/File:The_Dead_Sea_near_Ein_Gedi_1.jpg",
  },
];
