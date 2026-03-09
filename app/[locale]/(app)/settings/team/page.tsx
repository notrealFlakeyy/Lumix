import { SettingsView } from '../view'

export default async function SettingsTeamPage(props: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  return <SettingsView {...props} section="team" />
}
