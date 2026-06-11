import { Tabs } from 'expo-router'
import { Text } from 'react-native'

const icon = (emoji) => ({ focused }) => (
  <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
)

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#8b2635',
      tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#eeebe4' },
      headerStyle: { backgroundColor: '#f7f5f0' },
      headerTitleStyle: { color: '#18181a', fontWeight: '600' },
    }}>
      <Tabs.Screen name="index"        options={{ title: 'Book',        tabBarIcon: icon('✂️') }} />
      <Tabs.Screen name="appointments" options={{ title: 'Bookings',    tabBarIcon: icon('📅') }} />
      <Tabs.Screen name="rewards"      options={{ title: 'Rewards',     tabBarIcon: icon('⭐') }} />
      <Tabs.Screen name="profile"      options={{ title: 'Profile',     tabBarIcon: icon('👤') }} />
    </Tabs>
  )
}
