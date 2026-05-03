import { Types, Document } from "mongoose";

export type ByWhoModel = "Customer" | "Owner";

export type EventDayOfWeek =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export interface IEventEntry {
  checkedInAt: Date;
  registration: Types.ObjectId;
  byWho: Types.ObjectId;
  byWhoModel: ByWhoModel;
}

export interface IEventOccurrence {
  startDate?: Date;
  endDate?: Date;
  startTime?: string | null;
  endTime?: string | null;
  daysOfWeek?: EventDayOfWeek[];
  label?: string | null;
  isRecurring?: boolean;
}

export interface IEventAddressDetails {
  streetAddress?: string[];
  postalCode?: string;
  city?: string;
  department?: string;
  departmentCode?: string;
  region?: string;
  regionCode?: string;
  country?: string;
  insee?: string;
}

export interface IEventImage {
  url: string;
  title?: string | null;
  credits?: string | null;
  rightsStartDate?: Date | null;
  rightsEndDate?: Date | null;
  mimeType?: string | null;
  isMain?: boolean;
}

export interface IEventContact {
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  bookingUrl?: string | null;
}

export interface IEventExternalSource {
  name?: string | null;
  id?: string | null;
  url?: string | null;
  lastUpdate?: Date | null;
  lastUpdateDatatourisme?: Date | null;
}

export interface IEventTranslation {
  lang: string;
  title?: string;
  description?: string;
  shortDescription?: string;
  longDescription?: string;
}

export default interface IEvent extends Document {
  _id: Types.ObjectId;

  title: string;
  theme: string[];

  startingDate: Date;
  endingDate: Date;

  occurrences?: IEventOccurrence[];

  address: string;
  addressDetails?: IEventAddressDetails;

  location: {
    lat: number;
    lng: number;
    geo?: {
      type: "Point";
      coordinates: [number, number];
    };
  };

  price: number;
  discount: number;
  priceLabel?: string | null;
  isFree?: boolean;

  priceSpecification: {
    minPrice?: number;
    maxPrice?: number;
    priceCurrency?: string;
    pricingMode?: string;
    pricingOffer?: string;
  };

  capacity: number;
  registrationOpen: boolean;
  registrations: Types.ObjectId[];
  bills: Types.ObjectId[];
  entries: IEventEntry[];

  favorieds: {
    customer: Types.ObjectId;
    date: Date;
  }[];

  clics: {
    source: string;
    date: Date;
  }[];

  acceptedPaymentMethod: string[];

  organizer: {
    establishment?: Types.ObjectId;
    legalName: string;
    email: string;
    phone: string;
    website?: string | null;
  };

  contact?: IEventContact;

  image: string[];
  images?: IEventImage[];

  description: string;
  shortDescription?: string | null;
  longDescription?: string | null;

  translations: IEventTranslation[];

  externalSource?: IEventExternalSource;

  color: string;
  isDraft: boolean;
  deletedAt: Date;
}
