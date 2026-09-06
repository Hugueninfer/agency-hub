<?php

namespace App\Console\Commands;

use App\Mail\NotificationMail;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

#[Signature('mail:test')]
#[Description('Send a test email to verify Mailpit / SMTP is working')]
class TestMailCommand extends Command
{
    /**
     * Execute the console command.
     */
    public function handle()
    {
        $recipient = $this->argument('recipient') ?? 'dev@test.local';
        $this->info("Sending test email to {$recipient}...");

        Mail::to($recipient)->send(
            new NotificationMail(
                type: 'test',
                title: 'Mailpit Test Email',
                body: 'This is a test email sent from the development environment. If you can read this, Mailpit is working correctly!',
                actionUrl: 'http://localhost:8025',
                actionText: 'Open Mailpit',
            ),
        );

        $this->info('Test email sent successfully!');
        $this->warn('Open http://localhost:8025 in your browser to view it.');
    }

    protected function configure(): void
    {
        $this->addArgument('recipient', null, 'Email recipient', 'dev@test.local');
    }
}
