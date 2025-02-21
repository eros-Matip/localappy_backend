"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");
const Customers_1 = __importDefault(require("../models/Customers"));
const Retour_1 = __importDefault(require("../library/Retour"));
const axios_1 = __importDefault(require("axios"));
const createCustomer = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const {
        email,
        name,
        firstname,
        address,
        city,
        zip,
        phoneNumber,
        password,
        passwordConfirmed,
      } = req.body;
      if (
        !email ||
        !name ||
        !firstname ||
        !phoneNumber ||
        !address ||
        !city ||
        !zip
      ) {
        Retour_1.default.error("Some value is missing");
        return res.status(400).json("Some value is missing");
      }
      const token = uid2(26);
      const salt = uid2(26);
      const hash = SHA256(password + salt).toString(encBase64);
      const responseApiGouv = yield axios_1.default.get(
        `https://api-adresse.data.gouv.fr/search/?q=${address} ${zip} ${city}`
      );
      const latitude = responseApiGouv.data.features[0].geometry.coordinates[1];
      const longitude =
        responseApiGouv.data.features[0].geometry.coordinates[0];
      const customer = new Customers_1.default({
        email,
        account: {
          name,
          firstname,
          phoneNumber,
          address,
          zip,
          city,
          location: {
            lng: longitude,
            lat: latitude,
          },
        },
        premiumStatus: false,
        bills: [],
        eventsAttended: [],
        favorites: [],
        token,
        hash,
        salt,
      });
      if (!password || password !== passwordConfirmed) {
        Retour_1.default.error("Passwords arent confirmed");
        return res.status(400).json("Passwords arent confirmed");
      }
      yield customer.save();
      return res.status(201).json({ message: "Customer created", customer });
    } catch (error) {
      Retour_1.default.error("Error catched");
      return res.status(500).json({ message: "Error catched", error });
    }
  });
const readCustomer = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const customerId = req.params.customerId;
    try {
      const customer = yield Customers_1.default.findById(customerId);
      return customer
        ? res.status(200).json({ message: customer })
        : res.status(404).json({ message: "Not found" });
    } catch (error) {
      Retour_1.default.error("Error catched");
      return res.status(500).json({ message: "Error catched", error });
    }
  });
const readAll = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const customers = yield Customers_1.default.find();
      return res.status(200).json({ message: customers });
    } catch (error) {
      Retour_1.default.error("Error catched");
      return res.status(500).json({ message: "Error catched", error });
    }
  });
const updateCustomer = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const customerId = req.params.customerId;
    const customer = yield Customers_1.default.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: "Customer was not found" });
    } else {
      customer.set(req.body);
      return customer
        .save()
        .then((customer) => res.status(201).json({ customer: customer }))
        .catch((error) => {
          Retour_1.default.error("Error catched");
          return res.status(500).json({ message: "Error catched", error });
        });
    }
  });
const deleteCustomer = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const customerId = req.params.customerId;
    return Customers_1.default
      .findByIdAndDelete(customerId)
      .then((customer) =>
        customer
          ? res.status(200).json({ message: "Customer is deleted" })
          : res.status(404).json({ message: "Not found" })
      )
      .catch((error) => {
        Retour_1.default.error("Error catched");
        return res.status(500).json({ message: "Error catched", error });
      });
  });
exports.default = {
  createCustomer,
  readCustomer,
  readAll,
  updateCustomer,
  deleteCustomer,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ3VzdG9tZXJfdGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb250cm9sbGVycy9DdXN0b21lcl90ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFDM0MsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLHNCQUFzQixDQUFDLENBQUM7QUFDbEQsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBRzdCLG9FQUEyQztBQUMzQywrREFBdUM7QUFDdkMsa0RBQTBCO0FBRTFCLE1BQU0sY0FBYyxHQUFHLENBQU8sR0FBWSxFQUFFLEdBQWEsRUFBRSxFQUFFO0lBQzNELElBQUksQ0FBQztRQUNILE1BQU0sRUFDSixLQUFLLEVBQ0wsSUFBSSxFQUNKLFNBQVMsRUFDVCxPQUFPLEVBQ1AsSUFBSSxFQUNKLEdBQUcsRUFDSCxXQUFXLEVBQ1gsUUFBUSxFQUNSLGlCQUFpQixHQUNsQixHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUM7UUFFYixJQUNFLENBQUMsS0FBSztZQUNOLENBQUMsSUFBSTtZQUNMLENBQUMsU0FBUztZQUNWLENBQUMsV0FBVztZQUNaLENBQUMsT0FBTztZQUNSLENBQUMsSUFBSTtZQUNMLENBQUMsR0FBRyxFQUNKLENBQUM7WUFDRCxnQkFBTSxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1lBQ3RDLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQztRQUN2RCxDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQVcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQy9CLE1BQU0sSUFBSSxHQUFXLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUM5QixNQUFNLElBQUksR0FBVyxNQUFNLENBQUMsUUFBUSxH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
