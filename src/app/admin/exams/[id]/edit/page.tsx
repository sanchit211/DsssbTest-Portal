import EditExamClient from "./EditExamClient";

export const metadata = {
  title: "Exam Builder - MockExam Portal",
};

interface EditPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditExamPage({ params }: EditPageProps) {
  const { id } = await params;
  return <EditExamClient examId={id} />;
}
