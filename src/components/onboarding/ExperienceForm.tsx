
import React from 'react';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const experienceSchema = z.object({
  experienceLevel: z.string().min(1, { message: "Please select your experience level" }),
});

type ExperienceFormProps = {
  defaultValue: string | null;
  onSubmit: (values: z.infer<typeof experienceSchema>) => void;
  onBack: () => void;
};

export default function ExperienceForm({ defaultValue, onSubmit, onBack }: ExperienceFormProps) {
  const form = useForm<z.infer<typeof experienceSchema>>({
    resolver: zodResolver(experienceSchema),
    defaultValues: { experienceLevel: defaultValue || '' },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="experienceLevel"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <RadioGroup 
                    value={field.value} 
                    onValueChange={field.onChange}
                    className="space-y-4"
                  >
                    <div className="flex items-start space-x-2 py-2">
                      <RadioGroupItem value="beginner" id="beginner" />
                      <div className="grid gap-1.5">
                        <Label htmlFor="beginner" className="font-medium">Beginner</Label>
                        <p className="text-sm text-muted-foreground">
                          Less than 1 year of experience in hospitality
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-2 py-2">
                      <RadioGroupItem value="intermediate" id="intermediate" />
                      <div className="grid gap-1.5">
                        <Label htmlFor="intermediate" className="font-medium">Intermediate</Label>
                        <p className="text-sm text-muted-foreground">
                          1-3 years of experience in hospitality
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-2 py-2">
                      <RadioGroupItem value="experienced" id="experienced" />
                      <div className="grid gap-1.5">
                        <Label htmlFor="experienced" className="font-medium">Experienced</Label>
                        <p className="text-sm text-muted-foreground">
                          3-5 years of experience in hospitality
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-2 py-2">
                      <RadioGroupItem value="expert" id="expert" />
                      <div className="grid gap-1.5">
                        <Label htmlFor="expert" className="font-medium">Expert</Label>
                        <p className="text-sm text-muted-foreground">
                          More than 5 years of experience in hospitality
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
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
