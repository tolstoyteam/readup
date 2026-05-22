import type { BookPageElement } from "@readup/db";
import { Text, View } from "react-native";

function KeywordsBlock({ items }: { items: string[] }) {
  return (
    <View className="mb-4 mt-2 flex-row flex-wrap gap-2.5">
      {items.map((kw, i) => (
        <View
          key={`${kw}-${i}`}
          className="rounded-full border border-[#059669] bg-[#FBFAF2] px-3.5 py-2"
        >
          <Text className="font-reader text-sm text-[#1A2420]">{kw}</Text>
        </View>
      ))}
    </View>
  );
}

export function PageElements({ elements }: { elements: BookPageElement[] }) {
  return (
    <>
      {elements.map((el, i) => {
        switch (el.type) {
          case "chapter_name":
            return (
              <Text
                key={i}
                className="mb-7 font-reader text-[26px] font-bold leading-8 text-[#1A2420]"
              >
                {el.content}
              </Text>
            );
          case "text":
            return (
              <Text
                key={i}
                className="mb-5 font-reader text-[17px] leading-7 text-[#1A2420]"
              >
                {el.content}
              </Text>
            );
          case "quote":
            return (
              <View key={i} className="mb-6">
                <Text className="mb-2 ml-0.5 font-reader text-[22px] leading-6 text-[#7A7868]">
                  ❞
                </Text>
                <View className="rounded-xl border border-[#E8E6D8] bg-[#F2F0E6] px-[18px] py-4">
                  <Text className="font-reader text-[19px] font-medium leading-[30px] text-[#1A2420]">
                    {el.content}
                  </Text>
                </View>
              </View>
            );
          case "keywords":
            return <KeywordsBlock key={i} items={el.content} />;
          default:
            return null;
        }
      })}
    </>
  );
}
