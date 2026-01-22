export type AflVenue = {
  id: string;
  query: string;
  fallbackCenter?: [number, number];
};

export const aflVenues: AflVenue[] = [
  {
    id: "mcg",
    query: "Melbourne Cricket Ground",
    fallbackCenter: [144.9834, -37.8199],
  },
  {
    id: "marvel",
    query: "Marvel Stadium",
    fallbackCenter: [144.9475, -37.8165],
  },
  {
    id: "adelaide-oval",
    query: "Adelaide Oval",
    fallbackCenter: [138.5927, -34.9155],
  },
  {
    id: "optus",
    query: "Optus Stadium",
    fallbackCenter: [115.889, -31.9519],
  },
  {
    id: "gabba",
    query: "The Gabba",
    fallbackCenter: [153.0281, -27.4859],
  },
];
