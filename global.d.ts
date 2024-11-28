declare module "jsonwebtoken" {
  const decode: (token: string, options?: any) => any;
  const sign: (payload: any, secret: string, options?: any) => string;
  const verify: (
    token: string,
    secret: string,
    options?: any
  ) => { [key: string]: any };
  export { decode, sign, verify };
}
declare module "jwks-rsa";
