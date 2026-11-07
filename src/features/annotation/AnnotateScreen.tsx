import { useParams } from 'react-router'

const AnnotateScreen = () => {
  const { photoId } = useParams()
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6 text-foreground">
      <h1 className="text-xl font-semibold">Annotate {photoId}</h1>
    </main>
  )
}

export default AnnotateScreen
