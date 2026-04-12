migrate((app) => {
  const ensureCollection = (config) => {
    try {
      app.findCollectionByNameOrId(config.name);
      return;
    } catch (_) {
      app.save(new Collection(config));
    }
  };

  const noPublicRules = {
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null
  };

  ensureCollection({
    type: "base",
    name: "participants",
    ...noPublicRules,
    fields: [
      { name: "participant_id", type: "text", required: true, max: 80 },
      { name: "first_name_last_name", type: "text", required: true, max: 160 },
      { name: "nickname", type: "text", required: true, max: 80 },
      { name: "pin", type: "text", max: 16 },
      { name: "school_name", type: "text", required: true, max: 240 },
      { name: "created_at", type: "date" },
      { name: "codes_collected_count", type: "number" },
      { name: "is_complete", type: "bool" },
      { name: "completed_at", type: "date" },
      { name: "reward_issued", type: "bool" },
      { name: "status", type: "text", max: 40 },
      { name: "normalized_name", type: "text", required: true, max: 180 },
      { name: "normalized_nickname", type: "text", required: true, max: 100 },
      { name: "normalized_school", type: "text", required: true, max: 260 }
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_participants_participant_id ON participants (participant_id)",
      "CREATE UNIQUE INDEX idx_participants_identity ON participants (normalized_name, normalized_nickname, normalized_school)",
      "CREATE INDEX idx_participants_ranking ON participants (codes_collected_count, created_at)"
    ]
  });

  ensureCollection({
    type: "base",
    name: "teachers",
    ...noPublicRules,
    fields: [
      { name: "teacher_id", type: "text", required: true, max: 80 },
      { name: "first_name_last_name", type: "text", required: true, max: 160 },
      { name: "nickname", type: "text", required: true, max: 80 },
      { name: "pin", type: "text", required: true, max: 16 },
      { name: "is_active", type: "bool" },
      { name: "created_at", type: "date" },
      { name: "notes", type: "text", max: 500 },
      { name: "station_code", type: "text", required: true, max: 80 }
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_teachers_teacher_id ON teachers (teacher_id)",
      "CREATE UNIQUE INDEX idx_teachers_nickname ON teachers (nickname)",
      "CREATE UNIQUE INDEX idx_teachers_station_code ON teachers (station_code)"
    ]
  });

  ensureCollection({
    type: "base",
    name: "stations",
    ...noPublicRules,
    fields: [
      { name: "station_code", type: "text", required: true, max: 80 },
      { name: "station_name", type: "text", required: true, max: 160 },
      { name: "station_description", type: "text", max: 600 },
      { name: "station_type", type: "text", max: 80 },
      { name: "is_active", type: "bool" },
      { name: "display_order", type: "number" }
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_stations_station_code ON stations (station_code)",
      "CREATE INDEX idx_stations_display_order ON stations (display_order)"
    ]
  });

  ensureCollection({
    type: "base",
    name: "qr_codes",
    ...noPublicRules,
    fields: [
      { name: "qr_id", type: "text", required: true, max: 80 },
      { name: "qr_token", type: "text", required: true, max: 120 },
      { name: "station_code", type: "text", required: true, max: 80 },
      { name: "teacher_id", type: "text", required: true, max: 80 },
      { name: "created_at", type: "date" },
      { name: "is_active", type: "bool" }
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_qr_codes_qr_id ON qr_codes (qr_id)",
      "CREATE UNIQUE INDEX idx_qr_codes_qr_token ON qr_codes (qr_token)",
      "CREATE INDEX idx_qr_codes_teacher_active_created ON qr_codes (teacher_id, is_active, created_at)"
    ]
  });

  ensureCollection({
    type: "base",
    name: "scans",
    ...noPublicRules,
    fields: [
      { name: "scan_id", type: "text", required: true, max: 80 },
      { name: "timestamp", type: "date" },
      { name: "participant_id", type: "text", required: true, max: 80 },
      { name: "nickname", type: "text", max: 80 },
      { name: "station_code", type: "text", required: true, max: 80 },
      { name: "station_name", type: "text", max: 160 },
      { name: "scan_result", type: "text", max: 40 }
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_scans_scan_id ON scans (scan_id)",
      "CREATE INDEX idx_scans_participant_station ON scans (participant_id, station_code)",
      "CREATE INDEX idx_scans_timestamp ON scans (timestamp)"
    ]
  });

  ensureCollection({
    type: "base",
    name: "schools",
    ...noPublicRules,
    fields: [
      { name: "school_name", type: "text", required: true, max: 240 },
      { name: "is_active", type: "bool" },
      { name: "display_order", type: "number" }
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_schools_school_name ON schools (school_name)",
      "CREATE INDEX idx_schools_active_order ON schools (is_active, display_order)"
    ]
  });

  ensureCollection({
    type: "base",
    name: "settings",
    ...noPublicRules,
    fields: [
      { name: "key", type: "text", required: true, max: 120 },
      { name: "value", type: "text", max: 1000 }
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_settings_key ON settings (`key`)"
    ]
  });
}, (app) => {
  ["scans", "qr_codes", "participants", "teachers", "stations", "schools", "settings"].forEach((name) => {
    try {
      app.delete(app.findCollectionByNameOrId(name));
    } catch (_) {
      // Collection already absent.
    }
  });
});
