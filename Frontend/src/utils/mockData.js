export const MOCK_POST = {
  id: '1',
  title: 'LED not lighting up',
  short_description: 'Connected an LED with a resistor to Arduino but it never turns on.',
  arduino_code: `void setup() {
  pinMode(9, OUTPUT);
}

void loop() {
  digitalWrite(9, HIGH);
  delay(1000);
  digitalWrite(9, LOW);
  delay(1000);
}`,
  image_url: null,
  circuit_json: {
    hardware: {
      components: [
        { id: 'comp_1', type: 'wire',     start: { row: 'w', col: 1  }, end: { row: 'w', col: 10 } },
        { id: 'comp_2', type: 'wire',     start: { row: 'x', col: 1  }, end: { row: 'a', col: 5  } },
        { id: 'comp_3', type: 'resistor', start: { row: 'a', col: 5  }, end: { row: 'a', col: 9  } },
        { id: 'comp_4', type: 'led',      start: { row: 'a', col: 9  }, end: { row: 'e', col: 9  } },
        { id: 'comp_5', type: 'wire',     start: { row: 'e', col: 9  }, end: { row: 'w', col: 9  } },
        { id: 'comp_6', type: 'battery',  start: { row: 'y', col: 1  }, end: { row: 'z', col: 1  } },
      ],
    },
  },
  user: { id: 'user-1', username: 'arduino_newbie' },
};

export const MOCK_COMMENTS = [
  {
    id: 'c1',
    post_id: '1',
    user_id: 'gemini-pseudo',
    body: 'You are missing a resistor here — connecting an LED directly to 5V will likely burn it out.',
    x_coord: 288,
    y_coord: 90,
    user: { username: 'Gemini', is_pseudo_user: true },
    created_at: '2024-01-15T10:30:00Z',
  },
  {
    id: 'c2',
    post_id: '1',
    user_id: 'user-2',
    body: 'Also check LED polarity — longer leg (anode) should connect toward the resistor, shorter leg (cathode) to GND.',
    x_coord: 420,
    y_coord: 160,
    user: { username: 'helpfulengineer', is_pseudo_user: false },
    created_at: '2024-01-15T11:00:00Z',
  },
];

// TODO: replace with real Auth0 user
export const CURRENT_USER = {
  id: 'user-1',
  username: 'arduino_newbie',
  is_pseudo_user: false,
};
