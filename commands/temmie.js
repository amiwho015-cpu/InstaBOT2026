// @ts-check
/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "temmieshop",
  description:
    "A Whimsical ShOp RuN by TemMie, selling rAnDom and qUIrKy iteMs.",
  version: "1.0.3",
  author: "frnAlt",
  usage: "{prefix}temmieshop",
  category: "Shopping",
  permissions: [0],
  noPrefix: false,
  otherNames: ["temshop", "temstore", "temmie"],
  requirement: "3.0.0",
  icon: "🍣",
  cmdType: "cplx_g",
  isGame: true,
};

/**
 *
 * @param {CommandContext} param0
 * @returns
 */
export async function entry({ UTShop, money, input, ctx }) {
  const temmieShop = {
    sellDisallowed: [
      "highRollPass",
      "highRollpass",
      "temFlakes",
      "payTemCollege",
      "temArmor",
      "cat",
    ],
    key: "temShop",
    notScaredGeno: false,
    allowSell: true,
    itemData: [
      {
        icon: "🍘",
        name: "Temmie Flakes",
        flavorText: "tAsty fLakeS of teM. verY nUtriTious.",
        price: 1,
        key: "temFlakes",
        onPurchase({ moneySet }) {
          moneySet.inventory.push({
            name: "Temmie Flakes",
            key: "temFlakes",
            flavorText: "tem fLakeS boUght from teM ShOp. sooO gOOod!",
            icon: "🍘",
            type: "food",
            heal: 2,
            sellPrice: 5,
          });
        },
      },
      {
        icon: "🍙",
        name: "Temmie Flakes (Expensive)",
        key: "temFlakesPremium",
        flavorText: "tAsty fLakeS of teM. verY nUtriTious.",
        price: 20,
        onPurchase({ moneySet }) {
          moneySet.inventory.push({
            name: "Temmie Flakes (Expensive)",
            key: "temFlakesPremium",
            flavorText: "preMIum teM fLakeS boUght froM teM shOp. sooO gOOod!",
            icon: "🍙",
            type: "food",
            heal: 5,
            sellPrice: 5,
          });
        },
      },
      {
        icon: "🍣",
        name: "Temmie Flakes (Deluxe)",
        key: "temFlakesDeluxe",
        flavorText: "tAsty fLakeS of teM. verY nUtriTious.",
        price: 100,
        onPurchase({ moneySet }) {
          moneySet.inventory.push({
            name: "Temmie Flakes (Deluxe)",
            key: "temFlakesDeluxe",
            flavorText: "deluXe teM fLakeS boUght froM teM shOp. sooO gOOod!",
            icon: "🍣",
            type: "food",
            heal: 10,
            sellPrice: 5,
          });
        },
      },
    ],
    /*sellTexts: [
      "😺 teM nO bUy. teM oNly sEll!",
      "😸 temMIe nO neeD moRe iTEmS.",
      "😺 teM fuLl, nO bUy stUff.",
    ],*/
    askSellTexts: [
      "😻 teM wAnT tO bUY yOuR iTEmS!",
      "😺 teM wAnT haVe nEw itEmS fRom YaYa!",
    ],
    talkTexts: [
      {
        name: "Temmie History",
        responses: [
          "😺 teM teLl yOu aBout tEm hiStory! teM bEen heRe loNg tiMe!",
          "😺 teM anCestoRs weRe fAmous meRchAnts!",
          "😺 teM shOp alWays fUlL oF grEat sTuff!",
        ],
        icon: "📜",
      },
      {
        name: "Temmie Story",
        responses: [
          "😸 teM teLl yOu stoRy oF teM!",
          "😸 teM lOve shOp! teM loVe cuStomErs!",
          "😸 teM dReaM oF goIng tO coLLege!",
        ],
        icon: "👨‍💼",
      },
      {
        name: "Favorite Items",
        responses: [
          "😺 teM loVe aLl iTEmS! teM fLakeS arE beSt!",
          "😺 teM alwAys liKe preMIum fLakeS. sooO gOOod!",
          "😸 deLuxe fLakeS vEry sPecIal to teM.",
        ],
        icon: "⭐",
      },
      {
        name: "Customer Stories",
        responses: [
          "😺 mAny cuStomeRs loVe teM shOp!",
          "😸 oNe cuStomeR bUy sO maNy teM fLakeS!",
          "😸 teM shOp maKe eVeryOne hapPy!",
        ],
        icon: "🗣️",
      },
      {
        name: "Future Plans",
        responses: [
          "😺 teM waNt to maKe shOp bigGer!",
          "😸 teM dReaM oF moRe cuStomeRs anD moRe fLakeS!",
          "😸 teM eXciTed foR futuRe oF shOp!",
        ],
        icon: "🔮",
      },
      {
        name: "Shop Events",
        responses: [
          "😺 teM hAve spEciAl saLes soMetiMes!",
          "😸 teM shOp hAve bIg eVent foR fLakeS!",
          "😸 keEp eYe oUt foR spEciAl teM eVents!",
        ],
        icon: "🎉",
      },
      {
        name: "Local Legends",
        responses: [
          "😺 toWn hAve mAny leGends. teM loVe stoRies!",
          "😸 leGend sAy greAt waRRioR viSit teM shOp!",
          "😺 teM shOp pArt oF toWn hiStory!",
        ],
        icon: "📖",
      },
      {
        name: "Advice for Newcomers",
        responses: [
          "😺 teM sAy alWays loOk foR beSt deAls!",
          "😸 teM sAy be pAtient anD peRsisTent!",
          "😺 teM sAy asK qUestioNs anD fiNd beSt iTemS!",
        ],
        icon: "💡",
      },
    ],
    buyTexts: [
      "😺 whIch yOu waNt?",
      "😸 taKe tiMe, piCk beSt iTem!",
      "😺 leT teM knOw if nEed heLp!",
      "😺 aLl iTemS veRy gUd, taKe piCk!",
      "😸 yoU haVe goOd taSte, whIch iTem?",
    ],
    welcomeTexts: [
      "😺 weLcome tO teM shOp!",
      "😸 heLlo! brOwse teM iTemS!",
      "😺 hi! hoW caN teM heLp tOday?",
      "😸 weLcome! beSt iTemS in toWn!",
      "😺 gReetinGs! whAt yoU loOking foR?",
    ],
    goBackTexts: [
      "😿 iT's okAy, whAt dO yOu waNt?",
      "😿 nO woRries, taKe tiMe.",
      "😿 iT's alRight, leT teM knOw if nEed anYthIng.",
      "😿 dOn't stRess, teM heRe to heLp.",
      "😿 aLl gOod, whAt elSe teM caN dO foR yOu?",
    ],
    askTalkTexts: [
      "😺 whAt dO yOu waNt to tAlk aBout?",
      "😸 teM aLl eaRs, whAt to diScuSs?",
      "😺 leT's chAt! whAt's oN miNd?",
      "😺 feEl fRee to aSk teM anYthIng.",
      "😸 whAt yOu waNt to knOw?",
    ],
    thankTexts: [
      "😺 thAnks foR bUying!",
      "😸 thAnk yOu foR puRchaSe!",
      "😺 teM aPpreCiate buSiness!",
      "😸 thAnks! coMe agAin sOon!",
      "😺 enJoy neW iTem!",
    ],
  };

  const temCollege = {
    icon: "📚",
    xKey: "temCollege",
    key: "payTemCollege",
    name: "Pay Temmie College",
    flavorText: "heLp temMie pUrsue higHer edUcAtiOn!",
    price: 100000000,
    cannotBuy: true,
    onPurchase({ moneySet }) {
      moneySet.inventory.push({
        name: "Pay Temmie College Souvenir",
        key: "payTemCollege",
        flavorText:
          "yoU pAid foR teM's cOllege! teMmie iS sO hapPy hErE yOuR sOuvEnir!",
        icon: "📚",
        type: "key",
        sellPrice: 5,
      });
      moneySet.temmieCollege = true;
      temmieShop.itemData = temmieShop.itemData.filter(
        (i) => i.xKey !== "temCollege"
      );
    },
  };
  const temArmor = {
    icon: "🛡️",
    name: "Temmie Armor",
    flavorText: "suPer sTrOng arMor! maDe bY teMmiE fOr DeLTaPeTs!",
    key: "temArmor",
    type: "armor",
    def: 45,
    price: 99999999999,
    cannotBuy: true,
    onPurchase({ moneySet }) {
      moneySet.inventory.push({
        name: "Temmie Armor",
        key: "temArmor",
        flavorText: "yoU gOt teMmiE's aRmor! sO strOng, sO gUd!",
        icon: "🛡️",
        type: "armor",
        def: 65,
        sellPrice: 5,
      });
    },
  };

  const { temmieCollege = false } = await money.get(input.senderID);
  if (temmieCollege) {
    temmieShop.itemData.push(temArmor);
  } else {
    temmieShop.itemData.push(temCollege);
  }
  const shop = new UTShop(temmieShop);
  return shop.onPlay(ctx);
}

/**
 * @type {CommandStyle}
 */
export const style = {
  title: "😺 tEmMiEs sHoP!!!",
  titleFont: "bold",
  contentFont: "fancy",
};
