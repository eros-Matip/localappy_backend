import { Document, Types } from "mongoose";

interface IOpeningHours {
  dayOfWeek: string;
  opens: string;
  closes: string;
}

interface IAddress {
  street: string;
  city: string;
  postalCode: string;
  department: string;
  region: string;
  country: string;
}

interface ILocation {
  lat: number;
  lng: number;
}

interface IContact {
  email?: string;
  telephone?: string;
  fax?: string;
  website?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
}

interface IPaymentMethod {
  type: string;
  label: string;
}

interface ILegalInfo {
  insuranceCertificate?: string;
  KBis?: {
    public_id: string;
    secure_url: string;
  };
  activityCodeNAF?: string;
}

// Interface principale pour l’établissement
interface IEstablishment extends Document {
  name: string;
  type: string[];
  creationDate: Date;
  lastUpdate: Date;
  address: IAddress;
  location: ILocation;
  contact?: IContact;
  logo: { type: String };
  description?: string;
  openingHours: IOpeningHours[];
  acceptedPayments: IPaymentMethod[];
  legalInfo?: ILegalInfo;
  owner: Types.ObjectId;
  events: Types.ObjectId[];
  activated: boolean;
}

export default IEstablishment;
