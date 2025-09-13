CREATE TABLE public.profile_documents (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    filename text NOT NULL,
    path text NOT NULL,
    profile_id uuid NOT NULL,
    CONSTRAINT profile_documents_profile_id_fkey FOREIGN KEY (profile_id) 
        REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE TRIGGER profile_documents_set_updated_at_trigger 
BEFORE UPDATE ON public.profile_documents
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
