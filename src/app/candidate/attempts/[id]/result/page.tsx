import ResultClient from "./ResultClient";

export const metadata = {
  title: "Exam Result - MockExam Portal",
};

interface ResultPageProps {
  params: Promise<{ id: string }>;
}

export default async function ResultPage({ params }: ResultPageProps) {
  const { id } = await params;
  return <ResultClient attemptId={id} />;
}
