CREATE TABLE public.profile_apartments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    building_address text NOT NULL,
    apartment_no text NOT NULL,
    start_date date NOT NULL,
    offered_rent integer NOT NULL,
    profile_id uuid NOT NULL,
    CONSTRAINT profile_apartments_profile_id_fkey FOREIGN KEY (profile_id) 
        REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE TRIGGER profile_apartments_set_updated_at_trigger 
BEFORE UPDATE ON public.profile_apartments
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
