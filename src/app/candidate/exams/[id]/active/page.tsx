import ActiveExamClient from "./ActiveExamClient";

export const metadata = {
  title: "Active Exam Mock - MockExam Portal",
};

interface ActivePageProps {
  params: Promise<{ id: string }>;
}

export default async function ActiveExamPage({ params }: ActivePageProps) {
  const { id } = await params;
  return <ActiveExamClient examId={id} />;
}
