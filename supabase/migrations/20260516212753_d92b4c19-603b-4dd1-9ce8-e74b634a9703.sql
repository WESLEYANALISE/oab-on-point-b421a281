INSERT INTO storage.buckets (id, name, public) VALUES ('resumos-pdfs', 'resumos-pdfs', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read resumos-pdfs" ON storage.objects FOR SELECT USING (bucket_id = 'resumos-pdfs');
CREATE POLICY "Service writes resumos-pdfs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'resumos-pdfs');
CREATE POLICY "Service updates resumos-pdfs" ON storage.objects FOR UPDATE USING (bucket_id = 'resumos-pdfs');