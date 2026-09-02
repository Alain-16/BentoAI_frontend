import { Workspace } from "./Workspace";

/**
 * The workspace route.
 *
 * A Server Component whose only job is to read the id out of the URL and hand
 * it to the client component that does the work. `params` is a Promise in this
 * version of Next, so it has to be awaited - and PageProps is a global helper
 * here, which is why there is no import for it.
 *
 * There is no data fetching on the server. The workspace polls, so anything
 * rendered here would be replaced within two seconds of the page loading.
 */
export default async function MissionPage(props: PageProps<"/missions/[id]">) {
  const { id } = await props.params;
  return <Workspace missionId={id} />;
}
