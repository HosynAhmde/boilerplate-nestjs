'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Anchor,
  Button,
  Center,
  Paper,
  PinInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { apiPost, type ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toPersianDigits } from '@/lib/format';
import { normalizeMobile, toAsciiDigits } from '@/lib/mobile';

const mobileSchema = z.object({
  mobile: z
    .string()
    .trim()
    .refine((v) => normalizeMobile(v) !== null, 'شماره موبایل معتبر نیست'),
});
// The server says how many digits the code has (OTP_LENGTH, 4 to 8).
const codeSchema = (length: number) =>
  z.object({
    code: z
      .string()
      .transform(toAsciiDigits)
      .pipe(
        z
          .string()
          .regex(
            new RegExp(`^\\d{${length}}$`),
            `کد ${toPersianDigits(length)} رقمی را کامل وارد کنید`,
          ),
      ),
  });

interface OtpRequested {
  expiresInSeconds: number;
  resendInSeconds: number;
  codeLength: number;
}

export default function LoginPage() {
  const router = useRouter();
  const { status, signIn } = useAuth();
  const [mobile, setMobile] = useState<string | null>(null);
  const [codeLength, setCodeLength] = useState(5);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (status === 'authenticated') router.replace('/');
  }, [status, router]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const mobileForm = useForm({
    resolver: zodResolver(mobileSchema),
    defaultValues: { mobile: '' },
  });
  const codeForm = useForm({
    resolver: zodResolver(codeSchema(codeLength)),
    defaultValues: { code: '' },
  });

  const requestOtp = useMutation({
    mutationFn: (m: string) => apiPost<OtpRequested>('/auth/otp/request', { mobile: m }),
    onSuccess: (res, m) => {
      setMobile(m);
      setCodeLength(res.codeLength);
      setResendAt(Date.now() + res.resendInSeconds * 1000);
      codeForm.reset();
    },
    onError: (err: ApiError) => notifications.show({ color: 'red', message: err.message }),
  });

  const verifyOtp = useMutation({
    mutationFn: (code: string) =>
      apiPost<{ accessToken: string }>('/auth/otp/verify', { mobile, code }),
    onSuccess: async (res) => {
      await signIn(res.accessToken);
      router.replace('/');
    },
    onError: (err: ApiError) => {
      codeForm.setError('code', { message: err.message });
      codeForm.setValue('code', '');
    },
  });

  const resendIn = Math.max(0, Math.ceil((resendAt - now) / 1000));

  return (
    <Center mih="100vh" bg="var(--mantine-color-gray-0)" p="md">
      <Paper withBorder shadow="sm" p="xl" w="100%" maw={400}>
        <Stack>
          <div>
            <Title order={2}>گالری پاشا</Title>
            <Text c="dimmed" size="sm">
              ورود به سامانه مدیریت
            </Text>
          </div>

          {!mobile ? (
            <form
              onSubmit={mobileForm.handleSubmit(({ mobile: m }) =>
                requestOtp.mutate(normalizeMobile(m)!),
              )}
            >
              <Stack>
                <TextInput
                  label="شماره موبایل"
                  placeholder="۰۹۱۲۱۲۳۴۵۶۷"
                  inputMode="tel"
                  autoComplete="tel"
                  classNames={{ input: 'ltr' }}
                  autoFocus
                  error={mobileForm.formState.errors.mobile?.message}
                  {...mobileForm.register('mobile')}
                />
                <Button type="submit" loading={requestOtp.isPending}>
                  دریافت کد ورود
                </Button>
              </Stack>
            </form>
          ) : (
            <form onSubmit={codeForm.handleSubmit(({ code }) => verifyOtp.mutate(code))}>
              <Stack>
                <Text size="sm">
                  کد ارسال‌شده به <span className="ltr">{toPersianDigits(mobile)}</span> را وارد
                  کنید.
                </Text>
                <Controller
                  control={codeForm.control}
                  name="code"
                  render={({ field }) => (
                    <PinInput
                      length={codeLength}
                      type="number"
                      oneTimeCode
                      autoFocus
                      dir="ltr"
                      mx="auto"
                      value={field.value}
                      onChange={field.onChange}
                      onComplete={(v) => {
                        field.onChange(v);
                        void codeForm.handleSubmit(({ code }) => verifyOtp.mutate(code))();
                      }}
                      error={!!codeForm.formState.errors.code}
                    />
                  )}
                />
                {codeForm.formState.errors.code && (
                  <Text c="red" size="sm" ta="center">
                    {codeForm.formState.errors.code.message}
                  </Text>
                )}
                <Button type="submit" loading={verifyOtp.isPending}>
                  ورود
                </Button>
                <Text size="sm" ta="center">
                  {resendIn > 0 ? (
                    <>ارسال دوباره تا {toPersianDigits(resendIn)} ثانیه دیگر</>
                  ) : (
                    <Anchor
                      component="button"
                      type="button"
                      onClick={() => requestOtp.mutate(mobile)}
                    >
                      ارسال دوباره کد
                    </Anchor>
                  )}
                  {' · '}
                  <Anchor component="button" type="button" onClick={() => setMobile(null)}>
                    تغییر شماره
                  </Anchor>
                </Text>
              </Stack>
            </form>
          )}
        </Stack>
      </Paper>
    </Center>
  );
}
