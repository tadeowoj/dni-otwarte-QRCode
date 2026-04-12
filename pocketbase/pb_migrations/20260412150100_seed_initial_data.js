const SCHOOLS = [
  ["Szkoła Podstawowa im. Szarych Szeregów w Czyżewie", 1],
  ["Szkoła Podstawowa im. Ojca Świętego Jana Pawła II w Bogutach-Piankach", 2],
  ["Szkoła Podstawowa w Tymiankach-Buciach", 3],
  ["Szkoła Podstawowa im. Marii Konopnickiej w Nurze", 4],
  ["Szkoła Podstawowa im. Kardynała Stefana Wyszyńskiego w Szulborzu Wielkim", 5],
  ["Szkoła Podstawowa w Zarębach Kościelnych", 6],
  ["Szkoła Podstawowa w Andrzejewie", 7],
  ["Szkoła Podstawowa w Ołdakach-Polonii", 8],
  ["Szkoła Podstawowa im. Św. Jana Pawła II w Rosochatym-Kościelnym", 9],
  ["Szkoła Podstawowa w Dąbrowie Wielkiej", 10],
  ["Szkoła Podstawowa im. Kardynała Stefana Wyszyńskiego w Szepietowie", 11],
  ["Szkoła Podstawowa w Wojnach-Krupach", 12],
  ["Szkoła Podstawowa im. Polskiej Organizacji Wojskowej w Dąbrówce Kościelnej", 13],
  ["Szkoła Podstawowa im. Komisji Edukacji Narodowej w Klukowie", 14],
  ["Szkoła Podstawowa w Wyszonkach Kościelnych", 15],
  ["Szkoła Podstawowa w Łuniewie Małym", 16]
];

const SETTINGS = {
  required_codes_count: "15",
  event_name: "Dni Otwarte ZSOiZ",
  event_active: "TRUE",
  completion_message: "Gratulacje, zdobyles komplet punktow!",
  admin_pin: "1234",
  app_base_url: "https://qr.zsoiz-czyzew.pl/"
};

migrate((app) => {
  const upsertByData = (collectionName, fieldName, value, data) => {
    const collection = app.findCollectionByNameOrId(collectionName);
    let record;

    try {
      record = app.findFirstRecordByData(collectionName, fieldName, value);
    } catch (_) {
      record = new Record(collection);
    }

    Object.keys(data).forEach((key) => {
      record.set(key, data[key]);
    });

    app.save(record);
  };

  SCHOOLS.forEach(([school_name, display_order]) => {
    upsertByData("schools", "school_name", school_name, {
      school_name,
      is_active: true,
      display_order
    });
  });

  Object.keys(SETTINGS).forEach((key) => {
    upsertByData("settings", "key", key, {
      key,
      value: SETTINGS[key]
    });
  });
}, (app) => {
  SCHOOLS.forEach(([school_name]) => {
    try {
      app.delete(app.findFirstRecordByData("schools", "school_name", school_name));
    } catch (_) {
      // Already absent.
    }
  });

  Object.keys(SETTINGS).forEach((key) => {
    try {
      app.delete(app.findFirstRecordByData("settings", "key", key));
    } catch (_) {
      // Already absent.
    }
  });
});
