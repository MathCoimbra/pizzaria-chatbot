export type Metadata = {
  display_phone_number: string;
  phone_number_id: string;
};

export type Profile = {
  name: string;
};

export type Contact = {
  profile: Profile;
  wa_id: string;
};

export type Text = {
  body: string;
};

export type Message = {
  from: string;
  id: string;
  timestamp: string;
  text: Text;
  type: string;
  interactive: {
    button_reply: {
      id: string;
    };
  };
};

export type Change = {
  value: {
    messaging_product: string;
    metadata: Metadata;
    contacts: Contact[];
    messages: Message[];
  };
  field: string;
};

export type Entry = {
  id: string;
  changes: Change[];
};

export type WhatsAppWebhookEvent = {
  object: string;
  entry: Entry[];
};

export type WhatsAppMessage = {
  messaging_product: string,
  to: string;
  type: string;
  text?: {
    body?: string;
  },
  interactive?: object;
};