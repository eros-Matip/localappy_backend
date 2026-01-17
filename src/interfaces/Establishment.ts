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
  siret?: string;
  rna?: string;
  insuranceCertificate?: string;

  KBis?: {
    public_id: string;
    secure_url: string;
  };

  legalDocument?: {
    // pour association (statuts / récépissé / etc.)
    public_id: string;
    secure_url: string;
    label?: string;
  };

  activityCodeNAF?: string;
}

interface IEstablishment extends Document {
  name: string;
  email: string;
  phone: string;
  type: string[];
  creationDate: Date;
  lastUpdate: Date;
  address: IAddress;
  location: ILocation;
  contact?: IContact;
  logo: string;
  photos: string[];
  description?: string;
  openingHours: IOpeningHours[];
  acceptedPayments: IPaymentMethod[];

  legalForm: "company" | "association";
  legalInfo?: ILegalInfo;

  owner: Types.ObjectId;
  staff: Types.ObjectId[];
  events: Types.ObjectId[];
  ads: Types.ObjectId[];
  activated: boolean;
}

export default IEstablishment;
