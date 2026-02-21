import { Document, Types } from "mongoose";

export interface IStaffPublic {
  _id: Types.ObjectId;
  email: string;
  account: {
    firstname: string;
    name: string;
    phoneNumber?: number;
  };
  picture?: { url?: string; public_id?: string } | null;
  role?: string;
  isActive?: boolean;
}

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
  descriptionI18n?: {
    fr?: string;
    en?: string;
    es?: string;
    de?: string;
    it?: string;
    eu?: string;
  };
  openingHours: IOpeningHours[];
  acceptedPayments: IPaymentMethod[];
  legalForm: "company" | "association";
  legalInfo?: ILegalInfo;
  owner: Types.ObjectId;
  staff: Types.ObjectId[] | IStaffPublic[];
  events: Types.ObjectId[];
  notifications: Types.ObjectId[];
  refund: Types.ObjectId[];
  ads: Types.ObjectId[];
  activated: boolean;
  amountAvailable: number;
  banned: boolean;
  deletedAt: Date;
  // 🔔 Workflow activation
  activationRequested: boolean;
  activationRequestedAt?: Date | null;
  activationStatus: "pending" | "approved" | "rejected";
  activationReviewedAt?: Date | null;
  activationReviewedBy?: Types.ObjectId | null;
}

export default IEstablishment;
