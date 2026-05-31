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
  interactive: Interactive;
};

export type Status = {
  id: string;
  status: string;
  timestamp: string;
  recipient_id: string;
};

export type Interactive = {
  list_reply: {
    id: string;
    title: string;
  };
  button_reply: {
    id: string;
    title: string;
  };
};

export type Change = {
  value: {
    messaging_product: string;
    metadata: Metadata;
    contacts: Contact[];
    messages: Message[];
    statuses: Status[];
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
  image?: {
    link: string | undefined;
    caption: string | undefined;
  };
  text?: {
    body?: string;
  },
  interactive?: object;
};