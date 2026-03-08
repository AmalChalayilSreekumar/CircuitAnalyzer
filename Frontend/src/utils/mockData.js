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
            {
                "id": "comp_1",
                "type": "wire",
                "start": { "row": "z", "col": 10 },
                "end": { "row": "e", "col": 20 }
            },
            {
                "id": "comp_2",
                "type": "led",
                "start": { "row": "e", "col": 20 },
                "end": { "row": "d", "col": 21 }
            },
            {
                "id": "comp_3",
                "type": "resistor",
                "start": { "row": "e", "col": 24 },
                "end": { "row": "e", "col": 27 }
            },
            {
                "id": "comp_4",
                "type": "wire",
                "start": { "pin": "D9" },
                "end": { "row": "e", "col": 27 }
            }
        ],
    },
  },
  user: { id: 'user-1', username: 'arduino_newbie' },
};

export const MOCK_COMMENTS = [

];

// TODO: replace with real Auth0 user
export const CURRENT_USER = {
  id: 'user-1',
  username: 'arduino_newbie',
  is_pseudo_user: false,
};
