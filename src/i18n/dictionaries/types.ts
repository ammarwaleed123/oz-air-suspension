// The English dictionary is the source of truth for the shape; every locale
// must satisfy this type so missing keys are caught at build time.
export type Dictionary = {
  meta: { siteName: string; tagline: string };
  nav: {
    home: string;
    airKits: string;
    coilovers: string;
    rims: string;
    builds: string;
    airVsCoilovers: string;
    requestCar: string;
    account: string;
    cart: string;
    admin: string;
    signIn: string;
    signOut: string;
  };
  common: {
    currency: string;
    from: string;
    book: string;
    addToCart: string;
    learnMore: string;
    viewAll: string;
    loading: string;
    backHome: string;
    price: string;
    brand: string;
    manufactureDate: string;
  };
  home: {
    heroTitle: string;
    heroSubtitle: string;
    browseAirKits: string;
    browseCoilovers: string;
    browseRims: string;
  };
  airKits: {
    title: string;
    subtitle: string;
    setups: string;
    features: string;
    pickSetup: string;
  };
  coilovers: { title: string; subtitle: string };
  rims: {
    title: string;
    subtitle: string;
    diameter: string;
    width: string;
    boltPattern: string;
    offset: string;
    finish: string;
    filter: string;
    clearFilters: string;
  };
  booking: {
    title: string;
    depositNotice: string;
    pickDate: string;
    twoDayNotice: string;
    slotFull: string;
    available: string;
    confirm: string;
    earliestTomorrow: string;
  };
  requestCar: {
    title: string;
    subtitle: string;
    carMakeModel: string;
    year: string;
    notes: string;
    submit: string;
    thanks: string;
  };
  footer: { rights: string; location: string };
};
