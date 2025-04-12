
import React from 'react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const departmentSchema = z.object({
  department: z.string().min(1, { message: "Department is required" }),
  position: z.string().min(1, { message: "Position is required" }),
});

type DepartmentFormProps = {
  defaultValues: {
    department: string | null;
    position: string | null;
  };
  onSubmit: (values: z.infer<typeof departmentSchema>) => void;
  onBack: () => void;
  onDepartmentChange?: (department: string) => void;
};

export default function DepartmentForm({ 
  defaultValues, 
  onSubmit, 
  onBack, 
  onDepartmentChange 
}: DepartmentFormProps) {
  const form = useForm<z.infer<typeof departmentSchema>>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      department: defaultValues.department || '',
      position: defaultValues.position || '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department</FormLabel>
                <FormControl>
                  <Select 
                    value={field.value} 
                    onValueChange={(value) => {
                      field.onChange(value);
                      if (onDepartmentChange) {
                        onDepartmentChange(value);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select your department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Front Desk">Front Desk</SelectItem>
                      <SelectItem value="Housekeeping">Housekeeping</SelectItem>
                      <SelectItem value="Food & Beverage">Food & Beverage</SelectItem>
                      <SelectItem value="Kitchen">Kitchen</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                      <SelectItem value="Spa">Spa</SelectItem>
                      <SelectItem value="Management">Management</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="position"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Position</FormLabel>
                <FormControl>
                  <Input placeholder="Your job title" {...field} />
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
