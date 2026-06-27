// import { Host, Box, Text } from "@expo/ui/jetpack-compose";
// import { size, background } from "@expo/ui/jetpack-compose/modifiers";
// export default function index(props: any) {
//   return (
//     <>
//       <Host>
//         <Box>
//           <Text>sso</Text>
//         </Box>
//       </Host>
//     </>
//   );
// }

import PageWrap from "@/components/layout/PageWrap";
import JText from "@/components/ui/JText";
import { Host, Column, Text } from "@expo/ui/jetpack-compose";
import { fillMaxWidth, paddingAll } from "@expo/ui/jetpack-compose/modifiers";

export default function ColumnExample() {
  return (
    <PageWrap>
      <Host matchContents>
        <Column
          verticalArrangement={{ spacedBy: 8 }}
          horizontalAlignment="center"
          modifiers={[fillMaxWidth(), paddingAll(16)]}
        >
          <JText>First</JText>
          <JText>Second</JText>
          <JText>Third</JText>
        </Column>
      </Host>
    </PageWrap>
  );
}
