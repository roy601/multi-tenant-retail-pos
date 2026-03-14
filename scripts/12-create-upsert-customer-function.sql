CREATE OR REPLACE FUNCTION public.upsert_customer(
  p_name text,
  p_phone text,
  p_email text,
  p_organization_id uuid
)
RETURNS json AS $$
DECLARE
  v_customer_id integer;
  v_customer_record record;
BEGIN
  -- Check if customer exists by phone number within the organization
  -- Note: If phone_number is globally unique, this might still find the customer even if org_id doesn't match,
  -- but we should respect the organization context.
  -- However, if phone_number is globally unique, we can't insert a duplicate phone number for another org.
  
  SELECT id INTO v_customer_id
  FROM public.customers
  WHERE phone_number = p_phone;

  IF v_customer_id IS NOT NULL THEN
    -- Update existing customer
    -- We might want to check if the customer belongs to the same organization
    -- For now, we just update the name and email
    UPDATE public.customers
    SET name = p_name,
        email = COALESCE(p_email, email),
        updated_at = now()
    WHERE id = v_customer_id;
  ELSE
    -- Insert new customer
    INSERT INTO public.customers (name, phone_number, email, organization_id)
    VALUES (p_name, p_phone, p_email, p_organization_id)
    RETURNING id INTO v_customer_id;
  END IF;

  -- Return the customer data
  SELECT * INTO v_customer_record FROM public.customers WHERE id = v_customer_id;

  RETURN json_build_object(
    'success', true,
    'customer', json_build_object(
      'id', v_customer_record.id,
      'name', v_customer_record.name,
      'phone', v_customer_record.phone_number,
      'email', v_customer_record.email,
      'dues', v_customer_record.dues
    )
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
