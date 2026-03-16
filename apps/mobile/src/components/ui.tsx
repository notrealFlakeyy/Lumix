import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.screen}>{children}</ScrollView>
    </SafeAreaView>
  )
}

export function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      <View style={styles.card}>{children}</View>
    </View>
  )
}

export function AppText({ children, muted = false, strong = false }: { children: React.ReactNode; muted?: boolean; strong?: boolean }) {
  return <Text style={[styles.text, muted && styles.textMuted, strong && styles.textStrong]}>{children}</Text>
}

export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>
}

export function Field(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput placeholderTextColor="#8d98ab" style={styles.input} {...props} />
}

export function Button({
  title,
  onPress,
  disabled,
  variant = 'primary',
}: {
  title: string
  onPress?: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'ghost'
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'ghost' && styles.buttonGhost,
        (pressed || disabled) && styles.buttonPressed,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          variant === 'secondary' && styles.buttonTextSecondary,
          variant === 'ghost' && styles.buttonTextGhost,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  )
}

export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  )
}

export function ListCard({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <View style={styles.listCard}>
      <View style={styles.listCardBody}>
        <Text style={styles.listCardTitle}>{title}</Text>
        {subtitle ? <Text style={styles.listCardSubtitle}>{subtitle}</Text> : null}
      </View>
      {right ? <View>{right}</View> : null}
    </View>
  )
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDetail}>{detail}</Text>
    </View>
  )
}

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <View style={styles.loadingState}>
      <ActivityIndicator color="#0f172a" />
      <Text style={styles.sectionSubtitle}>{label}</Text>
    </View>
  )
}

export const uiStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
})

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#eef3f7',
  },
  screen: {
    padding: 20,
    gap: 20,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: '#526076',
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#d9e2ec',
  },
  text: {
    color: '#0f172a',
    fontSize: 15,
    lineHeight: 22,
  },
  textMuted: {
    color: '#526076',
  },
  textStrong: {
    fontWeight: '700',
  },
  label: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    fontSize: 15,
  },
  button: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#0f172a',
  },
  buttonSecondary: {
    backgroundColor: '#e2e8f0',
  },
  buttonGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  buttonPressed: {
    opacity: 0.72,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonTextSecondary: {
    color: '#0f172a',
  },
  buttonTextGhost: {
    color: '#0f172a',
  },
  statCard: {
    flexGrow: 1,
    minWidth: 140,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  statValue: {
    fontSize: 24,
    color: '#0f172a',
    fontWeight: '700',
  },
  listCard: {
    paddingVertical: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  listCardBody: {
    flex: 1,
    gap: 4,
  },
  listCardTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
  },
  listCardSubtitle: {
    color: '#526076',
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d9e2ec',
    backgroundColor: '#f8fafc',
    padding: 16,
    gap: 8,
  },
  emptyTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyDetail: {
    color: '#526076',
    fontSize: 14,
    lineHeight: 20,
  },
  loadingState: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 12,
  },
})
