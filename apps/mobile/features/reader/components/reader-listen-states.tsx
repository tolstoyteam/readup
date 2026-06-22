import { ActivityIndicator, Pressable, Text, View } from "react-native";

export function ReaderListenLoading({ message }: { message?: string }) {
  return (
    <View className="flex-1 items-center justify-center bg-[#FBFAF2] dark:bg-[#101512] px-8">
      <ActivityIndicator size="large" color="#059669" />
      {message ? (
        <Text className="mt-4 text-center text-[14px] tracking-[-0.56px] text-[#4A5550] dark:text-[#B8C1BB]">
          {message}
        </Text>
      ) : null}
    </View>
  );
}

export function ReaderListenError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View className="flex-1 items-center justify-center bg-[#FBFAF2] dark:bg-[#101512] px-8">
      <Text className="mb-4 text-center text-[14px] leading-[22px] tracking-[-0.56px] text-[#4A5550] dark:text-[#B8C1BB]">
        {message}
      </Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Повторить"
        className="min-h-[54px] w-full max-w-xs items-center justify-center rounded-full border-2 border-[#047857] dark:border-[#10B981] bg-[#059669] px-6 active:opacity-90"
      >
        <Text className="text-[18px] font-medium tracking-[-0.72px] text-[#FBFAF2]">
          Повторить
        </Text>
      </Pressable>
    </View>
  );
}
