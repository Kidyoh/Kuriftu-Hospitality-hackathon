
import React from 'react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const personalInfoSchema = z.object({
  phone: z.string().min(1, { message: "Phone number is required" }),
});

type PersonalInfoFormProps = {
  defaultValue: string | null;
  onSubmit: (values: z.infer<typeof personalInfoSchema>) => void;
  onBack: () => void;
};

export default function PersonalInfoForm({ defaultValue, onSubmit, onBack }: PersonalInfoFormProps) {
  const form = useForm<z.infer<typeof personalInfoSchema>>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: { phone: defaultValue || '' },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input placeholder="Your phone number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={onBack} type="button">Back</Button>
          <Button type="submit">Continue</Button>
        </div>
      </form>
    </Form>
  );
}
