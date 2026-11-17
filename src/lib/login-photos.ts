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
    src: "/login-bg/jerusalem-mount-of-olives.jpg",
    alt: "Jerusalem and the Mount of Olives at golden hour, from the air",
    credit: "Photo: Godot13, CC BY-SA 4.0 (resized), via Wikimedia Commons",
    creditUrl: "https://commons.wikimedia.org/wiki/File:2013-Aerial-Mount_of_Olives.jpg",
  },
  {
    src: "/login-bg/jerusalem-old-city-walls.jpg",
    alt: "Jerusalem Old City walls and the Tower of David",
    credit: "Photo: Pudelek, CC BY-SA 4.0 (resized), via Wikimedia Commons",
    creditUrl: "https://commons.wikimedia.org/wiki/File:Old_City_Walls_and_Tower_of_David_in_Jerusalem_(2019)_03.jpg",
  },
  {
    src: "/login-bg/habonim-dor-beach.jpg",
    alt: "A rusted shipwreck on the beach at Habonim",
    credit: "Photo: טל שמע, CC BY-SA 4.0 (resized), via Wikimedia Commons",
    creditUrl: "https://commons.wikimedia.org/wiki/File:Habonim-Dor_Beach.jpg",
  },
  {
    src: "/login-bg/negev-makhtesh-ramon.jpg",
    alt: "The Makhtesh Ramon crater in the Negev desert, from the air",
    credit: "Photo: Godot13, CC BY-SA 4.0 (resized), via Wikimedia Commons",
    creditUrl: "https://commons.wikimedia.org/wiki/File:Israel-2013-Aerial_00-Negev-Makhtesh_Ramon.jpg",
  },
  {
    src: "/login-bg/dead-sea-salt.jpg",
    alt: "Salt formation at the Dead Sea, from the air",
    credit: "Photo: Godot13, CC BY-SA 4.0 (resized), via Wikimedia Commons",
    creditUrl: "https://commons.wikimedia.org/wiki/File:Dead_Sea_salt_formation_(Aerial_view,_2007).jpg",
  },
  {
    src: "/login-bg/masada-cable-car.jpg",
    alt: "The cable car at Masada against a blue sky",
    credit: "Photo: Berthold Werner, public domain, via Wikimedia Commons",
    creditUrl: "https://commons.wikimedia.org/wiki/File:Israel_Aerial_Ropeway_Masada_BW_1.jpg",
  },
  {
    src: "/login-bg/umm-al-fahm-sunset.jpg",
    alt: "Sunset over Umm al-Fahm",
    credit: "Photo: Moataz Egbaria, CC BY-SA 3.0 (resized), via Wikimedia Commons",
    creditUrl: "https://commons.wikimedia.org/wiki/File:Sunsets_of_Umm_al-Fahm6.JPG",
  },
  {
    src: "/login-bg/jordan-valley-camels.jpg",
    alt: "A camel caravan crossing the Jordan Valley",
    credit: "Photo: Ishai Parasol from Israel, CC BY-SA 2.0 (resized), via Wikimedia Commons",
    creditUrl: "https://commons.wikimedia.org/wiki/File:Camels_in_Jordan_valley_(4568207363).jpg",
  },
  {
    src: "/login-bg/makhtesh-ramon-hills.jpg",
    alt: "Desert hills around Makhtesh Ramon",
    credit: "Photo: Rhododendrites, CC BY-SA 4.0 (resized), via Wikimedia Commons",
    creditUrl: "https://commons.wikimedia.org/wiki/File:Makhtesh_Ramon_(50785).jpg",
  },
];
