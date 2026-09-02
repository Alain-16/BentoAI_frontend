import { Review } from "./Review";

/** The pre-checkout gate. Reads the id from the URL and hands it over. */
export default async function ReviewPage(props: PageProps<"/missions/[id]/review">) {
  const { id } = await props.params;
  return <Review missionId={id} />;
}
