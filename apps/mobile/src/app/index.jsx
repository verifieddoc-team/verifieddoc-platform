// import { Text, View, StyleSheet } from "react-native";

// export default function Index() {
//   return (
//     <View style={styles.container}>
//       <Text>Edit src/app/index.tsx to edit this screen.</Text>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     alignItems: "center",
//     justifyContent: "center",
//   },
// });
import { Redirect } from "expo-router";

export default function Index() {
  return <Redirect href="/dev-menu" />;
}