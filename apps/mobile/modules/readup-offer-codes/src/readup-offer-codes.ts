import { requireOptionalNativeModule } from "expo";

type ReadupOfferCodesModule = {
  presentOfferCodeRedeemSheet: () => Promise<void>;
};

const nativeModule =
  requireOptionalNativeModule<ReadupOfferCodesModule>("ReadupOfferCodes");

export async function presentOfferCodeRedeemSheet(): Promise<void> {
  if (!nativeModule) {
    throw new Error("Offer code redemption requires a rebuilt native iOS app.");
  }
  await nativeModule.presentOfferCodeRedeemSheet();
}
